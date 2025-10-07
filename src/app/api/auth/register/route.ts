import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/utils/validation'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    const { firstName, lastName, email, phone, password } = validatedData

    // For now, we'll use a default club ID (Ceres Gymnastics Club)
    // Later this will be dynamic based on subdomain or club selection
    const defaultClubId = process.env.DEFAULT_CLUB_ID || 'ceres-gymnastics'

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        clubId: defaultClubId,
        email: email.toLowerCase()
      }
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User already exists with this email address'
      }, { status: 400 })
    }

    // Create club if it doesn't exist (for initial setup)
    let club = await prisma.club.findUnique({
      where: { id: defaultClubId }
    })

    if (!club) {
      club = await prisma.club.create({
        data: {
          id: defaultClubId,
          name: 'Ceres Gymnastics Club',
          email: 'info@ceresgymnastics.co.za',
          phone: '+27123456789',
          address: 'Ceres, Western Cape, South Africa'
        }
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        clubId: defaultClubId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: 'PARENT'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        clubs: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Rename clubs to club for frontend compatibility
    const { clubs, ...userWithoutClubs } = user

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...userWithoutClubs,
        club: clubs
      },
      message: 'Account created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Registration error:', error)
    
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