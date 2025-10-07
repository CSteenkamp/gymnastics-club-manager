import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// PUT - Update user profile
export async function PUT(request: NextRequest) {
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      address,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = body

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(emergencyContactName !== undefined && { emergencyContactName }),
        ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
        ...(emergencyContactRelation !== undefined && { emergencyContactRelation }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
