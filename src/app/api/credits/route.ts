import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const addCreditSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  source: z.enum(['MANUAL_ADDITION', 'REFUND', 'PROMOTION', 'TRANSFER', 'SYSTEM_ADJUSTMENT']),
  reference: z.string().optional(),
  notes: z.string().optional()
})

const applyCreditSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
    const includeTransactions = searchParams.get('includeTransactions') === 'true'

    // Parents can only view their own credit account
    if (userRole === 'PARENT' && targetUserId && targetUserId !== userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const queryUserId = targetUserId || userId

    // Get credit account with optional transaction history
    const creditAccount = await prisma.creditAccount.findFirst({
      where: {
        userId: queryUserId,
        clubId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        ...(includeTransactions && {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  total: true
                }
              },
              payment: {
                select: {
                  id: true,
                  amount: true,
                  reference: true
                }
              }
            }
          }
        })
      }
    })

    if (!creditAccount) {
      // Create credit account if it doesn't exist
      const newAccount = await prisma.creditAccount.create({
        data: {
          clubId,
          userId: queryUserId,
          currentBalance: 0,
          totalCreditsAdded: 0,
          totalCreditsUsed: 0
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        data: newAccount
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: creditAccount
    })

  } catch (error: any) {
    console.error('Get credit account error:', error)
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

    // Only admins can add/manage credits
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'add_credit') {
      return await handleAddCredit(body, userId, clubId)
    } else if (action === 'apply_credit') {
      return await handleApplyCredit(body, userId, clubId)
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid action'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Credit management error:', error)
    
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

async function handleAddCredit(body: any, adminUserId: string, clubId: string) {
  const validatedData = addCreditSchema.parse(body)

  // Verify target user exists and belongs to club
  const targetUser = await prisma.user.findFirst({
    where: {
      id: validatedData.userId,
      clubId
    }
  })

  if (!targetUser) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'User not found'
    }, { status: 404 })
  }

  // Get or create credit account
  let creditAccount = await prisma.creditAccount.findFirst({
    where: {
      userId: validatedData.userId,
      clubId
    }
  })

  if (!creditAccount) {
    creditAccount = await prisma.creditAccount.create({
      data: {
        clubId,
        userId: validatedData.userId,
        currentBalance: 0,
        totalCreditsAdded: 0,
        totalCreditsUsed: 0
      }
    })
  }

  // Add credit transaction
  const result = await prisma.$transaction(async (tx) => {
    const balanceBefore = Number(creditAccount.currentBalance)
    const balanceAfter = balanceBefore + validatedData.amount

    // Create credit transaction
    const transaction = await tx.creditTransaction.create({
      data: {
        clubId,
        creditAccountId: creditAccount.id,
        userId: validatedData.userId,
        type: 'CREDIT_ADDED',
        amount: validatedData.amount,
        balanceBefore,
        balanceAfter,
        description: validatedData.description,
        reference: validatedData.reference,
        source: validatedData.source,
        approvedBy: adminUserId
      }
    })

    // Update credit account balance
    const updatedAccount = await tx.creditAccount.update({
      where: { id: creditAccount.id },
      data: {
        currentBalance: balanceAfter,
        totalCreditsAdded: Number(creditAccount.totalCreditsAdded) + validatedData.amount,
        lastActivity: new Date()
      }
    })

    // Log data processing
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId: adminUserId,
        action: 'CREATE',
        purpose: 'Credit added to user account',
        dataTypes: ['credit_data', 'financial_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          targetUserId: validatedData.userId,
          amount: validatedData.amount,
          source: validatedData.source,
          transactionId: transaction.id
        }
      }
    })

    return { transaction, updatedAccount }
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    data: result,
    message: `Credit of R${validatedData.amount} added to ${targetUser.firstName} ${targetUser.lastName}'s account`
  })
}

async function handleApplyCredit(body: any, adminUserId: string, clubId: string) {
  const validatedData = applyCreditSchema.parse(body)

  // Get credit account
  const creditAccount = await prisma.creditAccount.findFirst({
    where: {
      userId: validatedData.userId,
      clubId
    }
  })

  if (!creditAccount) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Credit account not found'
    }, { status: 404 })
  }

  if (Number(creditAccount.currentBalance) < validatedData.amount) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Insufficient credit balance'
    }, { status: 400 })
  }

  // Verify invoice exists and belongs to user
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: validatedData.invoiceId,
      userId: validatedData.userId,
      clubId
    }
  })

  if (!invoice) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Invoice not found'
    }, { status: 404 })
  }

  if (invoice.status === 'PAID') {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Invoice is already paid'
    }, { status: 400 })
  }

  // Apply credit to invoice
  const result = await prisma.$transaction(async (tx) => {
    const balanceBefore = Number(creditAccount.currentBalance)
    const balanceAfter = balanceBefore - validatedData.amount

    // Create credit transaction
    const transaction = await tx.creditTransaction.create({
      data: {
        clubId,
        creditAccountId: creditAccount.id,
        userId: validatedData.userId,
        type: 'CREDIT_USED',
        amount: validatedData.amount,
        balanceBefore,
        balanceAfter,
        description: validatedData.description || `Credit applied to invoice ${invoice.invoiceNumber}`,
        relatedInvoiceId: validatedData.invoiceId,
        source: 'MANUAL_ADDITION',
        approvedBy: adminUserId
      }
    })

    // Create credit application record
    const application = await tx.creditApplication.create({
      data: {
        clubId,
        creditAccountId: creditAccount.id,
        invoiceId: validatedData.invoiceId,
        amount: validatedData.amount,
        appliedBy: adminUserId,
        description: validatedData.description,
        status: 'APPLIED'
      }
    })

    // Update credit account balance
    const updatedAccount = await tx.creditAccount.update({
      where: { id: creditAccount.id },
      data: {
        currentBalance: balanceAfter,
        totalCreditsUsed: Number(creditAccount.totalCreditsUsed) + validatedData.amount,
        lastActivity: new Date()
      }
    })

    // Update invoice total if fully paid
    const newInvoiceTotal = Number(invoice.total) - validatedData.amount
    const updatedInvoice = await tx.invoice.update({
      where: { id: validatedData.invoiceId },
      data: {
        total: newInvoiceTotal,
        status: newInvoiceTotal <= 0 ? 'PAID' : invoice.status,
        paidAt: newInvoiceTotal <= 0 ? new Date() : invoice.paidAt
      }
    })

    return { transaction, application, updatedAccount, updatedInvoice }
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    data: result,
    message: `Credit of R${validatedData.amount} applied to invoice ${invoice.invoiceNumber}`
  })
}