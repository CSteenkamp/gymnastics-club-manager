import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// POST - Mark invoice as paid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !['ADMIN', 'FINANCE_ADMIN'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    // Get the invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        clubId: payload.clubId
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
        error: 'Invoice is already marked as paid'
      }, { status: 400 })
    }

    // Update invoice status to PAID
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        updatedAt: new Date()
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
        items: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedInvoice,
      message: 'Invoice marked as paid successfully'
    })

  } catch (error) {
    console.error('Error marking invoice as paid:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
