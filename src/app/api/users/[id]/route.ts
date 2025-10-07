import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET a specific user
export async function GET(
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    // Check if user has admin/coach access
    if (!['ADMIN', 'FINANCE_ADMIN', 'COACH'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin or coach access required'
      }, { status: 403 })
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        clubId: payload.clubId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        phone: true
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('Error fetching user:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// UPDATE a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication (admin only)
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

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      role,
      phone,
      isActive,
      specialties
    } = body

    // Check if user exists and belongs to the same club
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // If email is being changed, check if it's already in use
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findFirst({
        where: {
          email,
          clubId: payload.clubId,
          id: {
            not: id
          }
        }
      })

      if (emailInUse) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Email already in use by another user'
        }, { status: 400 })
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['ADMIN', 'FINANCE_ADMIN', 'COACH', 'PARENT']
      if (!validRoles.includes(role)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
        }, { status: 400 })
      }
    }

    // Build update data object
    const updateData: any = {
      updatedAt: new Date()
    }
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (phone !== undefined) updateData.phone = phone
    if (isActive !== undefined) updateData.isActive = isActive
    if (specialties !== undefined) updateData.specialties = specialties

    // Update user
    const updatedUser = await prisma.user.update({
      where: {
        id
      },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        phone: true,
        specialties: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    })

  } catch (error) {
    console.error('Error updating user:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication (admin only)
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

    // Check if user exists and belongs to the same club
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Prevent deleting yourself
    if (id === payload.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You cannot delete your own account'
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false instead of hard delete
    await prisma.user.update({
      where: {
        id
      },
      data: {
        isActive: false
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
