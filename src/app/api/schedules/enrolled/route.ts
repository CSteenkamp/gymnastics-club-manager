import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch enrolled schedules for parent's children
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent access required'
      }, { status: 403 })
    }

    // Get all children for this parent
    const children = await prisma.child.findMany({
      where: {
        parents: {
          some: {
            id: payload.userId
          }
        }
      },
      select: {
        id: true
      }
    })

    const childIds = children.map(c => c.id)

    // Get all enrollments for these children
    const enrollments = await prisma.enrollment.findMany({
      where: {
        childId: {
          in: childIds
        },
        status: 'ACTIVE'
      },
      include: {
        schedules: {
          include: {
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: {
                enrollments: {
                  where: {
                    status: 'ACTIVE'
                  }
                }
              }
            }
          }
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Transform to match the expected format
    const schedules = enrollments.map(enrollment => ({
      id: enrollment.schedules.id,
      name: enrollment.schedules.name,
      description: enrollment.schedules.description,
      level: enrollment.schedules.level,
      dayOfWeek: enrollment.schedules.dayOfWeek,
      startTime: enrollment.schedules.startTime,
      endTime: enrollment.schedules.endTime,
      maxCapacity: enrollment.schedules.maxCapacity,
      currentEnrollment: enrollment.schedules._count.enrollments,
      venue: enrollment.schedules.location || 'TBD',
      coach: enrollment.schedules.coach,
      enrollment: {
        id: enrollment.id,
        childId: enrollment.childId,
        enrolledAt: enrollment.enrolledAt.toISOString()
      }
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: schedules
    })

  } catch (error) {
    console.error('Error fetching enrolled schedules:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
