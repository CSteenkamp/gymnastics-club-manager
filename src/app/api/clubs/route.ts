import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { hashPassword } from '@/lib/auth'

// GET all clubs (super admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (super admin only)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) where.isActive = isActive === 'true'

    const clubs = await prisma.club.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            children: true,
            invoices: true,
            schedules: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: clubs
    })

  } catch (error) {
    console.error('Error fetching clubs:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE a new club
export async function POST(request: NextRequest) {
  try {
    // Verify authentication (super admin only)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      logo,
      colors,
      settings,
      adminUser
    } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: name, email'
      }, { status: 400 })
    }

    // Check if club email already exists
    const existingClub = await prisma.club.findUnique({
      where: { email }
    })

    if (existingClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A club with this email already exists'
      }, { status: 400 })
    }

    // Generate unique club ID
    const clubId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`

    // Create club and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create club
      const club = await tx.club.create({
        data: {
          id: clubId,
          name,
          email,
          phone,
          address,
          logo,
          colors: colors || {
            primary: '#7c3aed',
            secondary: '#a855f7',
            accent: '#c084fc'
          },
          settings: settings || {
            timezone: 'Africa/Johannesburg',
            currency: 'ZAR',
            invoicePrefix: 'INV',
            features: {
              scheduling: true,
              notifications: true,
              reporting: true,
              onlinePayments: false
            }
          }
        }
      })

      // Create default admin user if provided
      if (adminUser) {
        const { firstName, lastName, email: adminEmail, password } = adminUser

        if (!firstName || !lastName || !adminEmail || !password) {
          throw new Error('Admin user requires: firstName, lastName, email, password')
        }

        // Check if admin email already exists
        const existingAdmin = await tx.user.findFirst({
          where: { email: adminEmail.toLowerCase() }
        })

        if (existingAdmin) {
          throw new Error('Admin email already exists')
        }

        const hashedPassword = await hashPassword(password)

        await tx.user.create({
          data: {
            clubId: club.id,
            email: adminEmail.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            role: 'ADMIN',
            emailNotifications: true,
            smsNotifications: false
          }
        })
      }

      return club
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'Club created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating club:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}