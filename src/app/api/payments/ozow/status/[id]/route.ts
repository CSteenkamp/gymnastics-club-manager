import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OzowService, getOzowConfig } from '@/lib/payments/ozow'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const paymentId = params.id

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clubId,
        method: 'OZOW',
        OR: [
          { parentId: userId },
          // Admin can check any payment in their club
          {
            invoice: {
              club: {
                users: {
                  some: {
                    id: userId,
                    role: { in: ['ADMIN', 'FINANCE_ADMIN'] }
                  }
                }
              }
            }
          }
        ]
      },
      include: {
        invoice: {
          include: {
            parent: true,
            child: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Payment not found or access denied'
      }, { status: 404 })
    }

    // Initialize Ozow service
    const ozowConfig = getOzowConfig()
    const ozowService = new OzowService(ozowConfig)

    // Try to get status from Ozow (if they provide an API)
    let ozowStatus = null
    if (payment.externalTransactionId) {
      const statusResult = await ozowService.getPaymentStatus(payment.externalTransactionId)
      if (statusResult.success) {
        ozowStatus = statusResult
      }
    }

    // Return payment status with additional metadata
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        externalTransactionId: payment.externalTransactionId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        metadata: payment.metadata,
        ozowStatus,
        invoice: {
          id: payment.invoice.id,
          number: payment.invoice.number,
          amount: payment.invoice.amount,
          status: payment.invoice.status,
          dueDate: payment.invoice.dueDate,
          child: {
            firstName: payment.invoice.child.firstName,
            lastName: payment.invoice.child.lastName
          }
        }
      },
      message: 'Payment status retrieved successfully'
    })

  } catch (error: any) {
    console.error('Ozow payment status error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}