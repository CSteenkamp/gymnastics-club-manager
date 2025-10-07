import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        invoice_items: {
          include: {
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                level: true,
                monthlyFee: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            reference: true,
            processedAt: true,
            status: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 })
    }

    // Parents can only see their own invoices
    if (userRole === 'PARENT' && invoice.userId !== userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: invoice
    })

  } catch (error: any) {
    console.error('Get invoice error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(
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

    // Only admins can update invoices
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const body = await request.json()
    const { status, dueDate, notes } = body

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        clubId
      }
    })

    if (!invoice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 })
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes })
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
        invoice_items: true,
        payments: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    })

  } catch (error: any) {
    console.error('Update invoice error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(
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

    // Only admins can delete invoices
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        payments: true
      }
    })

    if (!invoice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 })
    }

    // Don't allow deletion of invoices with payments
    if (invoice.payments.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot delete invoice with payments. Please void the payments first.'
      }, { status: 400 })
    }

    await prisma.invoice.delete({
      where: { id: params.id }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Invoice deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete invoice error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
