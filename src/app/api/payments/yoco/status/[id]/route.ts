import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { YocoService, getYocoConfig } from '@/lib/payments/yoco'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const paymentId = params.id

    // Find payment with access control
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clubId,
        method: 'YOCO',
        ...(userRole === 'ADMIN' || userRole === 'FINANCE_ADMIN' 
          ? {} // Admins can see all payments in their club
          : { parentId: userId } // Parents can only see their own payments
        )
      },
      include: {
        invoice: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        activities: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!payment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Yoco payment not found'
      }, { status: 404 })
    }

    // Get live status from Yoco if we have a checkout ID
    let liveStatus = null
    const yocoCheckoutId = payment.metadata?.yocoCheckoutId

    if (yocoCheckoutId && payment.status === 'PENDING') {
      try {
        const yocoConfig = getYocoConfig()
        const yocoService = new YocoService(yocoConfig)
        const statusResult = await yocoService.getCheckoutStatus(yocoCheckoutId)
        
        if (statusResult.success) {
          liveStatus = {
            status: statusResult.status,
            lastChecked: new Date().toISOString()
          }
        }
      } catch (error) {
        console.warn('Failed to get live Yoco status:', error)
      }
    }

    // Format response data
    const responseData = {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      reference: payment.reference,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      externalTransactionId: payment.externalTransactionId,
      yocoCheckoutId: payment.metadata?.yocoCheckoutId,
      yocoPaymentId: payment.metadata?.yocoPaymentId,
      invoice: {
        id: payment.invoice.id,
        number: payment.invoice.number,
        dueDate: payment.invoice.dueDate,
        child: payment.invoice.child
      },
      activities: payment.activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        amount: activity.amount,
        createdAt: activity.createdAt,
        metadata: activity.metadata
      })),
      metadata: payment.metadata,
      liveStatus
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: responseData
    })

  } catch (error: any) {
    console.error('Yoco payment status error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins can manually update payment status
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const paymentId = params.id
    const body = await request.json()
    const { action, reason } = body

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clubId,
        method: 'YOCO'
      },
      include: {
        invoice: true
      }
    })

    if (!payment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Yoco payment not found'
      }, { status: 404 })
    }

    let updateData: any = {}
    let activityType = ''
    let activityDescription = ''

    switch (action) {
      case 'cancel':
        if (payment.status !== 'PENDING') {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Only pending payments can be cancelled'
          }, { status: 400 })
        }
        updateData = { status: 'CANCELLED' }
        activityType = 'PAYMENT_CANCELLED'
        activityDescription = `Yoco payment cancelled by admin. Reason: ${reason || 'No reason provided'}`
        break

      case 'mark_paid':
        if (payment.status === 'COMPLETED') {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Payment is already completed'
          }, { status: 400 })
        }
        updateData = { 
          status: 'COMPLETED',
          processedAt: new Date()
        }
        activityType = 'PAYMENT_COMPLETED'
        activityDescription = `Yoco payment manually marked as completed by admin. Reason: ${reason || 'Manual verification'}`
        
        // Also update the invoice
        await prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paidAmount: payment.amount
          }
        })
        break

      case 'refresh_status':
        // Check live status with Yoco
        const yocoCheckoutId = payment.metadata?.yocoCheckoutId
        if (!yocoCheckoutId) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'No Yoco checkout ID found'
          }, { status: 400 })
        }

        try {
          const yocoConfig = getYocoConfig()
          const yocoService = new YocoService(yocoConfig)
          const statusResult = await yocoService.getCheckoutStatus(yocoCheckoutId)
          
          if (statusResult.success && statusResult.payment) {
            const yocoStatus = yocoService.processWebhook({
              id: statusResult.payment.id,
              type: 'payment.status_update',
              created: new Date().toISOString(),
              object: statusResult.payment
            })

            if (yocoStatus.valid && yocoStatus.data) {
              updateData = {
                status: yocoStatus.data.status,
                processedAt: yocoStatus.data.status === 'COMPLETED' ? new Date() : payment.processedAt
              }
              activityType = 'STATUS_REFRESH'
              activityDescription = `Status refreshed from Yoco: ${yocoStatus.data.status}`

              // Update invoice if payment completed
              if (yocoStatus.data.status === 'COMPLETED') {
                await prisma.invoice.update({
                  where: { id: payment.invoiceId },
                  data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    paidAmount: payment.amount
                  }
                })
              }
            }
          }
        } catch (error) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Failed to refresh status from Yoco'
          }, { status: 500 })
        }
        break

      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    // Update payment
    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData
    })

    // Log activity
    await prisma.paymentActivity.create({
      data: {
        paymentId,
        type: activityType,
        description: activityDescription,
        amount: action === 'mark_paid' ? payment.amount : undefined,
        metadata: {
          adminUserId: userId,
          reason: reason || null,
          action
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Yoco payment ${action === 'cancel' ? 'cancelled' : action === 'refresh_status' ? 'status refreshed' : 'updated'} successfully`
    })

  } catch (error: any) {
    console.error('Yoco payment update error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}