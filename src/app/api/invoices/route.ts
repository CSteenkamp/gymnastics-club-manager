import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMonthlyInvoice, generateBulkInvoices } from '@/lib/invoice'
import { ApiResponse } from '@/types'

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

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')

    const whereClause: any = { clubId }

    // Parents can only see their own invoices
    if (userRole === 'PARENT') {
      whereClause.userId = userId
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status.toUpperCase()
    }

    // Filter by month/year if provided
    if (month && year) {
      whereClause.month = parseInt(month)
      whereClause.year = parseInt(year)
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        items: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                level: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            processedAt: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: invoices
    })

  } catch (error: any) {
    console.error('Get invoices error:', error)
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

    // Only admins can manually create invoices
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const body = await request.json()
    const { parentUserId, month, year, dueDate } = body

    if (!parentUserId || !month || !year || !dueDate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: parentUserId, month, year, dueDate'
      }, { status: 400 })
    }

    // Validate parent belongs to the same club
    const parent = await prisma.user.findFirst({
      where: {
        id: parentUserId,
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

    const invoice = await generateMonthlyInvoice({
      clubId,
      userId: parentUserId,
      month: parseInt(month),
      year: parseInt(year),
      dueDate: new Date(dueDate)
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create invoice error:', error)
    
    if (error.message.includes('already exists')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}