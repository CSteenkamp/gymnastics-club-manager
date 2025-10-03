import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET a specific enrollment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true,
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
        },
        schedule: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            maxCapacity: true,
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Enrollment not found'
      }, { status: 404 })
    }

    // For parents, verify they can access this enrollment
    if (payload.role === 'PARENT') {
      const isParentOfChild = enrollment.child.parents.some(parent => parent.id === payload.userId)
      if (!isParentOfChild) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Access denied'
        }, { status: 403 })
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enrollment
    })

  } catch (error) {
    console.error('Error fetching enrollment:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// UPDATE an enrollment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    // Check if enrollment exists and belongs to club
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
      },
      include: {
        child: {
          include: {
            parents: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!existingEnrollment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Enrollment not found'
      }, { status: 404 })
    }

    // For parents, verify they can modify this enrollment
    if (payload.role === 'PARENT') {
      const isParentOfChild = existingEnrollment.child.parents.some(parent => parent.id === payload.userId)
      if (!isParentOfChild) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'You can only modify your own children\'s enrollments'
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { startDate, endDate, notes, isActive } = body

    const updateData: any = {}
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (notes !== undefined) updateData.notes = notes
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true
          }
        },
        schedule: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedEnrollment,
      message: 'Enrollment updated successfully'
    })

  } catch (error) {
    console.error('Error updating enrollment:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE an enrollment (or deactivate)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    // Check if enrollment exists and belongs to club
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
      },
      include: {
        child: {
          include: {
            parents: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!existingEnrollment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Enrollment not found'
      }, { status: 404 })
    }

    // For parents, verify they can delete this enrollment
    if (payload.role === 'PARENT') {
      const isParentOfChild = existingEnrollment.child.parents.some(parent => parent.id === payload.userId)
      if (!isParentOfChild) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'You can only withdraw your own children from classes'
        }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hardDelete') === 'true'

    if (hardDelete && ['ADMIN', 'FINANCE_ADMIN'].includes(payload.role)) {
      // Hard delete for admins only
      await prisma.enrollment.delete({
        where: { id: params.id }
      })
    } else {
      // Soft delete (deactivate)
      await prisma.enrollment.update({
        where: { id: params.id },
        data: {
          isActive: false,
          endDate: new Date()
        }
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: hardDelete ? 'Enrollment deleted successfully' : 'Child withdrawn from class successfully'
    })

  } catch (error) {
    console.error('Error deleting enrollment:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}