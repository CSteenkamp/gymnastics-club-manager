import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentSchema } from '@/utils/validation'
import { markInvoiceAsPaid } from '@/lib/invoice'
import { ApiResponse } from '@/types'
import { Decimal } from '@prisma/client/runtime/library'

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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause based on user role
    const whereClause: any = {
      clubId
    }

    // Parents can only see their own payments, try both old userId and new parentId
    if (userRole === 'PARENT') {
      whereClause.OR = [
        { userId: userId }, // Old schema compatibility
        { parentId: userId } // New schema
      ]
    }

    // Add filters
    if (status) {
      whereClause.status = status
    }
    
    if (method) {
      whereClause.method = method
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        invoice: {
          include: {
            items: {
              include: {
                child: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        activities: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get latest activity only
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.payment.count({
      where: whereClause
    })

    // Format response data
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      reference: payment.reference,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      externalTransactionId: payment.externalTransactionId,
      payfastTransactionId: payment.payfastTransactionId,
      parent: payment.parent || payment.user,
      invoice: payment.invoice,
      latestActivity: payment.activities?.[0] || null,
      metadata: payment.metadata
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error: any) {
    console.error('Get payments error:', error)
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

    const body = await request.json()
    const { parentUserId, invoiceId, amount, method, reference, notes } = body

    // Validate payment data
    const validatedData = paymentSchema.parse({
      amount,
      method,
      reference,
      notes
    })

    let targetUserId = parentUserId

    // If no parentUserId provided and user is a parent, use their own ID
    if (!targetUserId && userRole === 'PARENT') {
      targetUserId = userId
    }

    // Only admins can create payments for other users
    if (userRole === 'PARENT' && targetUserId !== userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    if (!targetUserId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent user ID is required'
      }, { status: 400 })
    }

    // Validate parent user
    const parent = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        clubId,
        role: 'PARENT'
      }
    })

    if (!parent) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent not found'
      }, { status: 404 })
    }

    // Validate invoice if provided
    let invoice = null
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          clubId,
          userId: targetUserId
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
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        clubId,
        parentId: targetUserId,
        userId: targetUserId,
        invoiceId,
        amount: new Decimal(validatedData.amount),
        method: validatedData.method,
        reference: validatedData.reference,
        notes: validatedData.notes
      },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            month: true,
            year: true,
            total: true
          }
        }
      }
    })

    // If payment is for an invoice and covers the full amount, mark invoice as paid
    if (invoice && new Decimal(validatedData.amount).equals(invoice.total)) {
      await markInvoiceAsPaid(invoice.id, payment.id)
    }

    // Log activity
    await prisma.auditLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        newValues: {
          amount: validatedData.amount.toString(),
          method: validatedData.method,
          parentUserId: targetUserId,
          invoiceId: invoiceId || null
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create payment error:', error)
    
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