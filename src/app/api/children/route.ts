import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { childSchema } from '@/utils/validation'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get('x-user-id')
    let clubId = request.headers.get('x-club-id')
    let userRole = request.headers.get('x-user-role')

    // Fallback: Extract from JWT token if headers not set (development mode)
    if (!userId || !clubId) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'No authorization header'
        }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      
      // Import verifyToken here to avoid circular dependencies
      const { verifyToken } = await import('@/lib/auth')
      const payload = verifyToken(token)
      
      if (!payload) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid token'
        }, { status: 401 })
      }

      userId = payload.userId
      clubId = payload.clubId
      userRole = payload.role
    }

    let children

    // Admins can see all children, parents only see their own
    if (userRole === 'ADMIN' || userRole === 'FINANCE_ADMIN') {
      children = await prisma.child.findMany({
        where: { clubId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          level: true,
          status: true,
          monthlyFee: true,
          notes: true,
          parents: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    } else {
      children = await prisma.child.findMany({
        where: {
          clubId,
          parents: {
            some: {
              id: userId
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          level: true,
          status: true,
          monthlyFee: true,
          notes: true,
          parents: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: children
    })

  } catch (error: any) {
    console.error('Get children error:', error)
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

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = childSchema.parse(body)
    const { firstName, lastName, dateOfBirth, gender, level, monthlyFee, notes } = validatedData

    // Create child
    const child = await prisma.child.create({
      data: {
        clubId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        level,
        monthlyFee,
        notes,
        parents: {
          connect: {
            id: userId
          }
        }
      },
      include: {
        parents: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Log activity
    await prisma.childActivity.create({
      data: {
        childId: child.id,
        type: 'ENROLLMENT',
        description: `Child enrolled in ${level}`,
        newValue: level,
        createdBy: userId
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: child,
      message: 'Child added successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create child error:', error)
    
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