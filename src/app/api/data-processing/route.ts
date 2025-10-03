import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Only admins can view data processing logs
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const legalBasis = searchParams.get('legalBasis')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const targetUserId = searchParams.get('userId')
    const childId = searchParams.get('childId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const whereClause: any = { clubId }

    if (action) {
      whereClause.action = action
    }

    if (legalBasis) {
      whereClause.legalBasis = legalBasis
    }

    if (targetUserId) {
      whereClause.userId = targetUserId
    }

    if (childId) {
      whereClause.childId = childId
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Get logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.dataProcessingLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.dataProcessingLog.count({
        where: whereClause
      })
    ])

    // Get summary statistics
    const stats = await prisma.dataProcessingLog.groupBy({
      by: ['action', 'legalBasis'],
      where: {
        clubId,
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {})
          }
        } : {})
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        logs,
        statistics: stats,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error: any) {
    console.error('Get data processing logs error:', error)
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
    const {
      targetUserId,
      childId,
      action,
      purpose,
      dataTypes,
      legalBasis,
      source,
      metadata
    } = body

    // Create data processing log entry
    const log = await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId: targetUserId || userId, // User whose data was processed
        childId,
        action,
        purpose,
        dataTypes,
        legalBasis,
        source: source || 'manual_entry',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        child: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: log,
      message: 'Data processing activity logged successfully'
    })

  } catch (error: any) {
    console.error('Create data processing log error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}