import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { YocoService, getYocoConfig } from '@/lib/payments/yoco'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const createPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  description: z.string(),
  successUrl: z.string().url(),
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
          { userId: userId },
          // Admin can create payments for any invoice in their club
          {
            clubs: {
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
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        invoice_items: {
          include: {
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
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

    // Initialize Yoco service
    const yocoConfig = getYocoConfig()
    const yocoService = new YocoService(yocoConfig)

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        clubId,
        parentId: invoice.parentId,
        invoiceId: invoice.id,
        amount: validatedData.amount,
        status: 'PENDING',
        method: 'YOCO',
        reference: `INV-${invoice.number}`,
        metadata: {
          invoiceNumber: invoice.number,
          childName: `${invoice.child.firstName} ${invoice.child.lastName}`,
          description: validatedData.description
        }
      }
    })

    // Generate Yoco checkout
    const webhookUrl = `${request.nextUrl.origin}/api/payments/yoco/webhook`
    
    const paymentRequest = {
      amount: validatedData.amount,
      currency: 'ZAR',
      description: validatedData.description,
      metadata: {
        invoiceId: invoice.id,
        clubId: clubId,
        userId: payment.id,
        childName: `${invoice.child.firstName} ${invoice.child.lastName}`,
        invoiceNumber: invoice.number
      },
      successUrl: validatedData.successUrl,
      cancelUrl: validatedData.cancelUrl,
      webhookUrl,
      customerEmail: invoice.parent.email,
      customerPhone: invoice.parent.phone || undefined
    }

    const checkoutResponse = await yocoService.createCheckout(paymentRequest)

    if (!checkoutResponse.success) {
      // Delete the payment record if Yoco checkout creation failed
      await prisma.payment.delete({
        where: { id: payment.id }
      })

      return NextResponse.json<ApiResponse>({
        success: false,
        error: checkoutResponse.error || 'Failed to create payment'
      }, { status: 500 })
    }

    // Update payment with Yoco checkout ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalTransactionId: checkoutResponse.checkoutId,
        metadata: {
          ...payment.metadata,
          yocoCheckoutId: checkoutResponse.checkoutId
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: checkoutResponse.checkoutUrl,
        checkoutId: checkoutResponse.checkoutId
      },
      message: 'Yoco checkout created successfully'
    })

  } catch (error: any) {
    console.error('Yoco payment creation error:', error)
    
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