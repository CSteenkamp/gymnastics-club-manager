import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const processOverpaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  action: z.enum(['convert_to_credit', 'refund', 'apply_to_next_invoice']),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only admins can view overpayments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Find overpayments (payments that exceed invoice total)
    const overpayments = await prisma.payment.findMany({
      where: {
        clubId,
        status: 'COMPLETED',
        invoice: {
          isNot: null
        }
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true
          }
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Filter to only actual overpayments
    const actualOverpayments = overpayments.filter(payment => {
      if (!payment.invoice) return false
      return Number(payment.amount) > Number(payment.invoice.total)
    }).map(payment => ({
      ...payment,
      overpaymentAmount: Number(payment.amount) - Number(payment.invoice!.total)
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: actualOverpayments
    })

  } catch (error: any) {
    console.error('Get overpayments error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only admins can process overpayments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = processOverpaymentSchema.parse(body)

    // Get payment with invoice details
    const payment = await prisma.payment.findFirst({
      where: {
        id: validatedData.paymentId,
        clubId,
        status: 'COMPLETED'
      },
      include: {
        invoice: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!payment || !payment.invoice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Payment or invoice not found'
      }, { status: 404 })
    }

    const overpaymentAmount = Number(payment.amount) - Number(payment.invoice.total)
    
    if (overpaymentAmount <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No overpayment found for this payment'
      }, { status: 400 })
    }

    let result: any = {}

    if (validatedData.action === 'convert_to_credit') {
      result = await convertOverpaymentToCredit(
        payment, 
        overpaymentAmount, 
        userId, 
        clubId, 
        validatedData.notes
      )
    } else if (validatedData.action === 'refund') {
      result = await processRefund(
        payment, 
        overpaymentAmount, 
        userId, 
        clubId, 
        validatedData.notes
      )
    } else if (validatedData.action === 'apply_to_next_invoice') {
      result = await applyToNextInvoice(
        payment, 
        overpaymentAmount, 
        userId, 
        clubId, 
        validatedData.notes
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: `Overpayment of R${overpaymentAmount.toFixed(2)} processed successfully`
    })

  } catch (error: any) {
    console.error('Process overpayment error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid input data',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function convertOverpaymentToCredit(
  payment: any,
  overpaymentAmount: number,
  adminUserId: string,
  clubId: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get or create credit account
    let creditAccount = await tx.creditAccount.findFirst({
      where: {
        userId: payment.parentId,
        clubId
      }
    })

    if (!creditAccount) {
      creditAccount = await tx.creditAccount.create({
        data: {
          clubId,
          userId: payment.parentId,
          currentBalance: 0,
          totalCreditsAdded: 0,
          totalCreditsUsed: 0
        }
      })
    }

    const balanceBefore = Number(creditAccount.currentBalance)
    const balanceAfter = balanceBefore + overpaymentAmount

    // Create credit transaction
    const transaction = await tx.creditTransaction.create({
      data: {
        clubId,
        creditAccountId: creditAccount.id,
        userId: payment.parentId,
        type: 'CREDIT_ADDED',
        amount: overpaymentAmount,
        balanceBefore,
        balanceAfter,
        description: `Overpayment converted to credit from payment ${payment.reference || payment.id}`,
        reference: payment.id,
        relatedPaymentId: payment.id,
        source: 'PAYMENT_OVERPAYMENT',
        approvedBy: adminUserId,
        metadata: {
          originalPaymentAmount: Number(payment.amount),
          invoiceTotal: Number(payment.invoice.total),
          overpaymentAmount,
          notes
        }
      }
    })

    // Update credit account
    const updatedAccount = await tx.creditAccount.update({
      where: { id: creditAccount.id },
      data: {
        currentBalance: balanceAfter,
        totalCreditsAdded: Number(creditAccount.totalCreditsAdded) + overpaymentAmount,
        lastActivity: new Date()
      }
    })

    // Adjust payment amount to match invoice total
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        amount: payment.invoice.total,
        notes: `${payment.notes || ''} | Overpayment of R${overpaymentAmount} converted to credit`.trim()
      }
    })

    // Log the conversion
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId: adminUserId,
        action: 'CREATE',
        purpose: 'Overpayment converted to credit',
        dataTypes: ['payment_data', 'credit_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          paymentId: payment.id,
          overpaymentAmount,
          userId: payment.parentId,
          transactionId: transaction.id
        }
      }
    })

    return { transaction, updatedAccount }
  })
}

async function processRefund(
  payment: any,
  overpaymentAmount: number,
  adminUserId: string,
  clubId: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Create a refund payment record
    const refundPayment = await tx.payment.create({
      data: {
        clubId,
        parentId: payment.parentId,
        amount: -overpaymentAmount, // Negative amount for refund
        status: 'COMPLETED',
        method: payment.method,
        reference: `REFUND-${payment.reference || payment.id}`,
        notes: `Refund for overpayment. ${notes || ''}`.trim(),
        paidAt: new Date(),
        processedAt: new Date(),
        metadata: {
          originalPaymentId: payment.id,
          refundReason: 'overpayment',
          processedBy: adminUserId
        }
      }
    })

    // Adjust original payment amount
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        amount: payment.invoice.total,
        notes: `${payment.notes || ''} | Overpayment of R${overpaymentAmount} refunded`.trim()
      }
    })

    // Log the refund
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId: adminUserId,
        action: 'CREATE',
        purpose: 'Overpayment refunded',
        dataTypes: ['payment_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          originalPaymentId: payment.id,
          refundPaymentId: refundPayment.id,
          overpaymentAmount,
          userId: payment.parentId
        }
      }
    })

    return { refundPayment }
  })
}

async function applyToNextInvoice(
  payment: any,
  overpaymentAmount: number,
  adminUserId: string,
  clubId: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Find next pending invoice for this user
    const nextInvoice = await tx.invoice.findFirst({
      where: {
        userId: payment.parentId,
        clubId,
        status: 'PENDING',
        id: { not: payment.invoiceId }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (!nextInvoice) {
      throw new Error('No pending invoice found to apply overpayment')
    }

    // Apply overpayment to next invoice
    const newInvoiceTotal = Math.max(0, Number(nextInvoice.total) - overpaymentAmount)
    
    await tx.invoice.update({
      where: { id: nextInvoice.id },
      data: {
        total: newInvoiceTotal,
        status: newInvoiceTotal <= 0 ? 'PAID' : 'PENDING',
        paidAt: newInvoiceTotal <= 0 ? new Date() : null
      }
    })

    // Create a payment record for the applied amount
    const appliedPayment = await tx.payment.create({
      data: {
        clubId,
        parentId: payment.parentId,
        invoiceId: nextInvoice.id,
        amount: Math.min(overpaymentAmount, Number(nextInvoice.total)),
        status: 'COMPLETED',
        method: payment.method,
        reference: `OVERPAY-${payment.reference || payment.id}`,
        notes: `Applied from overpayment. ${notes || ''}`.trim(),
        paidAt: new Date(),
        processedAt: new Date(),
        metadata: {
          originalPaymentId: payment.id,
          appliedFromOverpayment: true,
          processedBy: adminUserId
        }
      }
    })

    // Adjust original payment amount
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        amount: payment.invoice.total,
        notes: `${payment.notes || ''} | Overpayment of R${overpaymentAmount} applied to invoice ${nextInvoice.invoiceNumber}`.trim()
      }
    })

    // Log the application
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId: adminUserId,
        action: 'CREATE',
        purpose: 'Overpayment applied to next invoice',
        dataTypes: ['payment_data', 'invoice_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          originalPaymentId: payment.id,
          appliedPaymentId: appliedPayment.id,
          targetInvoiceId: nextInvoice.id,
          overpaymentAmount,
          userId: payment.parentId
        }
      }
    })

    return { appliedPayment, nextInvoice }
  })
}