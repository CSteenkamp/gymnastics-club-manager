import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/utils/validation'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    const { email, password } = validatedData

    // For now, use default club ID
    const defaultClubId = process.env.DEFAULT_CLUB_ID || 'ceres-gymnastics'

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        clubId: defaultClubId,
        email: email.toLowerCase(),
        isActive: true
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Generate JWT token
    const token = generateToken(user)

    // Return user data (without password)
    const { password: _, club, ...userWithoutPassword } = user

    // Create response with cookie
    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          club
        },
        token
      },
      message: 'Login successful'
    })

    // Set HTTP-only cookie for authentication (keep for API access)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false, // Disable secure for localhost testing
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error: any) {
    console.error('Login error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid input data',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}