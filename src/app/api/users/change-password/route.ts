import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, comparePassword, hashPassword } from '@/lib/auth'
import { ApiResponse } from '@/types'

// POST - Change user password
export async function POST(request: NextRequest) {
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
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Current password and new password are required'
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'New password must be at least 6 characters long'
      }, { status: 400 })
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, password: true }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Current password is incorrect'
      }, { status: 401 })
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
