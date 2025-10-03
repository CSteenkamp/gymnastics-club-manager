import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OzowService, getOzowConfig } from '@/lib/payments/ozow'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const createPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  itemName: z.string(),
  itemDescription: z.string().optional(),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url()
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Get invoice to validate ownership and get details
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validatedData.invoiceId,
        clubId,
        OR: [
          { parentId: userId },
          // Admin can create payments for any invoice in their club
          {
            club: {
              users: {
                some: {
                  id: userId,
                  role: { in: ['ADMIN', 'FINANCE_ADMIN'] }
                }
              }
            }
          }
        ]
      },
      include: {
        parent: true,
        child: true
      }
    })

    if (!invoice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invoice not found or access denied'
      }, { status: 404 })
    }

    // Validate amount matches invoice
    if (Math.abs(validatedData.amount - invoice.amount) > 0.01) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Payment amount does not match invoice amount'
      }, { status: 400 })
    }

    // Check if invoice is already paid
    if (invoice.status === 'PAID') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invoice is already paid'
      }, { status: 400 })
    }

    // Initialize Ozow service
    const ozowConfig = getOzowConfig()
    const ozowService = new OzowService(ozowConfig)

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        clubId,
        parentId: invoice.parentId,
        invoiceId: invoice.id,
        amount: validatedData.amount,
        status: 'PENDING',
        method: 'OZOW',
        reference: `INV-${invoice.number}`,
        metadata: {
          invoiceNumber: invoice.number,
          childName: `${invoice.child.firstName} ${invoice.child.lastName}`,
          description: validatedData.itemName
        }
      }
    })

    // Generate unique transaction reference
    const transactionReference = `CGC-${payment.id}-${Date.now()}`
    const bankReference = `Invoice ${invoice.number}`

    // Generate Ozow payment URL
    const notifyUrl = `${request.nextUrl.origin}/api/payments/ozow/notify`
    
    const paymentRequest = {
      amount: validatedData.amount,
      transactionReference,
      bankReference,
      customerFirstName: invoice.parent.firstName,
      customerLastName: invoice.parent.lastName,
      customerEmail: invoice.parent.email,
      customerPhone: invoice.parent.phone || '',
      successUrl: validatedData.returnUrl,
      cancelUrl: validatedData.cancelUrl,
      errorUrl: validatedData.cancelUrl, // Use cancel URL for errors
      notifyUrl,
      optional1: invoice.id, // Invoice ID
      optional2: clubId, // Club ID
      optional3: payment.id // Payment ID
    }

    const paymentResponse = await ozowService.generatePaymentUrl(paymentRequest)

    if (!paymentResponse.success) {
      // Delete the payment record if Ozow URL generation failed
      await prisma.payment.delete({
        where: { id: payment.id }
      })

      return NextResponse.json<ApiResponse>({
        success: false,
        error: paymentResponse.error || 'Failed to create payment'
      }, { status: 500 })
    }

    // Update payment with Ozow transaction reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalTransactionId: transactionReference,
        metadata: {
          ...payment.metadata,
          ozowTransactionReference: transactionReference,
          ozowBankReference: bankReference
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        paymentId: payment.id,
        paymentUrl: paymentResponse.paymentUrl,
        transactionId: transactionReference
      },
      message: 'Payment created successfully'
    })

  } catch (error: any) {
    console.error('Ozow payment creation error:', error)
    
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