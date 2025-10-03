import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization')
    let token = extractTokenFromHeader(authHeader)

    // If no Authorization header, try to get token from cookies
    if (!token) {
      token = request.cookies.get('token')?.value
    }

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No token provided'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true,
            status: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json<ApiResponse>({
      success: true,
      data: userWithoutPassword
    })

  } catch (error: any) {
    console.error('Auth verification error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}