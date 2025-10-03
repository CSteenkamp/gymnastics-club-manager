import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { childSchema } from '@/utils/validation'
import { ApiResponse } from '@/types'

interface Context {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: Context) {
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

    const childId = params.id

    const whereClause: any = {
      id: childId,
      clubId
    }

    // Parents can only access their own children
    if (userRole === 'PARENT') {
      whereClause.parents = {
        some: {
          id: userId
        }
      }
    }

    const child = await prisma.child.findFirst({
      where: whereClause,
      include: {
        parents: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
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

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: child
    })

  } catch (error: any) {
    console.error('Get child error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
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

    const childId = params.id
    const body = await request.json()
    const validatedData = childSchema.parse(body)

    const whereClause: any = {
      id: childId,
      clubId
    }

    // Parents can only update their own children (limited fields)
    if (userRole === 'PARENT') {
      whereClause.parents = {
        some: {
          id: userId
        }
      }
      // Parents can only update basic info, not fees
      delete validatedData.monthlyFee
    }

    // Get current child data for activity logging
    const existingChild = await prisma.child.findFirst({
      where: whereClause
    })

    if (!existingChild) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    const { firstName, lastName, dateOfBirth, level, monthlyFee, notes } = validatedData

    // Update child
    const updatedChild = await prisma.child.update({
      where: { id: childId },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        level,
        monthlyFee: userRole !== 'PARENT' ? monthlyFee : undefined,
        notes
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

    // Log activities for changes
    const activities = []

    if (existingChild.level !== level) {
      activities.push({
        childId,
        type: 'LEVEL_CHANGE' as const,
        description: `Level changed from ${existingChild.level} to ${level}`,
        oldValue: existingChild.level,
        newValue: level,
        createdBy: userId
      })
    }

    if (userRole !== 'PARENT' && existingChild.monthlyFee?.toString() !== monthlyFee?.toString()) {
      activities.push({
        childId,
        type: 'FEE_CHANGE' as const,
        description: `Monthly fee changed from R${existingChild.monthlyFee || 0} to R${monthlyFee || 0}`,
        oldValue: existingChild.monthlyFee?.toString() || '0',
        newValue: monthlyFee?.toString() || '0',
        createdBy: userId
      })
    }

    if (activities.length > 0) {
      await prisma.childActivity.createMany({
        data: activities
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedChild,
      message: 'Child updated successfully'
    })

  } catch (error: any) {
    console.error('Update child error:', error)
    
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

export async function DELETE(request: NextRequest, { params }: Context) {
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

    // Only admins can delete children
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const childId = params.id

    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        clubId
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    // Mark as withdrawn instead of hard delete
    await prisma.child.update({
      where: { id: childId },
      data: {
        status: 'WITHDRAWN'
      }
    })

    // Log activity
    await prisma.childActivity.create({
      data: {
        childId,
        type: 'WITHDRAWAL',
        description: 'Child withdrawn from club',
        createdBy: userId
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Child withdrawn successfully'
    })

  } catch (error: any) {
    console.error('Delete child error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}