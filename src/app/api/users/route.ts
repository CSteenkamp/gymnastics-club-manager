import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, hashPassword } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { randomUUID } from 'crypto'

// GET all users for a club (with optional role filter)
export async function GET(request: NextRequest) {
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

    // Check if user has admin/coach access for viewing other users
    if (!['ADMIN', 'FINANCE_ADMIN', 'COACH'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin or coach access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')

    const where: any = {
      clubId: payload.clubId
    }

    if (role) where.role = role
    if (isActive !== null) where.isActive = isActive === 'true'

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        phone: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: users
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE a new user (admin only)
export async function POST(request: NextRequest) {
  try {
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
      phone
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, role'
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['ADMIN', 'FINANCE_ADMIN', 'COACH', 'PARENT']
    if (!validRoles.includes(role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      }, { status: 400 })
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        clubId: payload.clubId
      }
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User with this email already exists'
      }, { status: 400 })
    }

    // Create user (without password - they'll need to set it up)
    // Generate a random temporary password
    const tempPassword = randomUUID()
    const hashedPassword = await hashPassword(tempPassword)

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        clubId: payload.clubId,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        phone,
        isActive: true,
        updatedAt: new Date()
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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}