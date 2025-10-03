import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, hashPassword } from '@/lib/auth'
import { ApiResponse } from '@/types'

// POST - Setup new club with initial data
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
      club,
      adminUser,
      feeStructures,
      initialSchedules
    } = body

    // Validate required fields
    if (!club?.name || !club?.email || !adminUser?.email || !adminUser?.password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: club.name, club.email, adminUser.email, adminUser.password'
      }, { status: 400 })
    }

    // Check if club email already exists
    const existingClub = await prisma.club.findUnique({
      where: { email: club.email }
    })

    if (existingClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A club with this email already exists'
      }, { status: 400 })
    }

    // Check if admin email already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: adminUser.email.toLowerCase() }
    })

    if (existingAdmin) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin email already exists'
      }, { status: 400 })
    }

    // Generate unique club ID
    const clubId = `${club.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create club
      const newClub = await tx.club.create({
        data: {
          id: clubId,
          name: club.name,
          email: club.email,
          phone: club.phone || null,
          address: club.address || null,
          logo: club.logo || null,
          colors: club.colors || {
            primary: '#7c3aed',
            secondary: '#a855f7',
            accent: '#c084fc'
          },
          settings: club.settings || {
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

      // 2. Create admin user
      const hashedPassword = await hashPassword(adminUser.password)
      const admin = await tx.user.create({
        data: {
          clubId: newClub.id,
          email: adminUser.email.toLowerCase(),
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          password: hashedPassword,
          phone: adminUser.phone || null,
          role: 'ADMIN',
          emailNotifications: true,
          smsNotifications: false
        }
      })

      // 3. Create default fee structures
      const defaultFeeStructures = feeStructures || [
        { level: 'RR', monthlyFee: 450, description: 'Recreational Readiness' },
        { level: 'R', monthlyFee: 500, description: 'Recreational' },
        { level: 'Pre-Level 1', monthlyFee: 550, description: 'Pre-Level 1' },
        { level: 'Level 1', monthlyFee: 650, description: 'Level 1' },
        { level: 'Level 2', monthlyFee: 700, description: 'Level 2' },
        { level: 'Level 3', monthlyFee: 750, description: 'Level 3' },
        { level: 'Level 4', monthlyFee: 800, description: 'Level 4' },
        { level: 'Level 5', monthlyFee: 850, description: 'Level 5' }
      ]

      await tx.feeStructure.createMany({
        data: defaultFeeStructures.map(fee => ({
          clubId: newClub.id,
          level: fee.level,
          monthlyFee: fee.monthlyFee,
          description: fee.description
        }))
      })

      // 4. Create initial schedules if provided
      if (initialSchedules && initialSchedules.length > 0) {
        await tx.schedule.createMany({
          data: initialSchedules.map((schedule: any) => ({
            clubId: newClub.id,
            name: schedule.name,
            level: schedule.level,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            maxCapacity: schedule.maxCapacity || 12,
            location: schedule.location || null,
            description: schedule.description || null
          }))
        })
      }

      return {
        club: newClub,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        },
        feeStructuresCreated: defaultFeeStructures.length,
        schedulesCreated: initialSchedules?.length || 0
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'Club setup completed successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error setting up club:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

// GET - Get setup status for a club
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
    if (!payload || !['ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clubId = searchParams.get('clubId') || payload.clubId

    // Super admin can check any club, others can only check their own
    if (payload.role !== 'SUPER_ADMIN' && clubId !== payload.clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    // Get setup status
    const [
      club,
      adminCount,
      feeStructureCount,
      scheduleCount,
      memberCount,
      invoiceCount
    ] = await Promise.all([
      prisma.club.findUnique({
        where: { id: clubId }
      }),
      prisma.user.count({
        where: {
          clubId,
          role: { in: ['ADMIN', 'FINANCE_ADMIN'] }
        }
      }),
      prisma.feeStructure.count({
        where: { clubId }
      }),
      prisma.schedule.count({
        where: { clubId }
      }),
      prisma.child.count({
        where: { clubId }
      }),
      prisma.invoice.count({
        where: { clubId }
      })
    ])

    if (!club) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    const setupStatus = {
      club: {
        basic: !!club.name && !!club.email,
        branding: !!club.logo || !!club.colors,
        settings: !!club.settings
      },
      administration: {
        admins: adminCount > 0,
        feeStructures: feeStructureCount > 0
      },
      operations: {
        schedules: scheduleCount > 0,
        members: memberCount > 0,
        billing: invoiceCount > 0
      }
    }

    const overallComplete = Object.values(setupStatus.club).every(Boolean) &&
                           Object.values(setupStatus.administration).every(Boolean) &&
                           setupStatus.operations.schedules

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        clubId,
        clubName: club.name,
        setupStatus,
        overallComplete,
        completionPercentage: calculateCompletionPercentage(setupStatus),
        recommendations: generateRecommendations(setupStatus)
      }
    })

  } catch (error) {
    console.error('Error checking setup status:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function calculateCompletionPercentage(setupStatus: any): number {
  const allItems = [
    ...Object.values(setupStatus.club),
    ...Object.values(setupStatus.administration),
    setupStatus.operations.schedules
  ]
  
  const completedItems = allItems.filter(Boolean).length
  return Math.round((completedItems / allItems.length) * 100)
}

function generateRecommendations(setupStatus: any): string[] {
  const recommendations = []

  if (!setupStatus.club.branding) {
    recommendations.push('Add your club logo and customize brand colors')
  }

  if (!setupStatus.administration.feeStructures) {
    recommendations.push('Set up fee structures for different levels')
  }

  if (!setupStatus.operations.schedules) {
    recommendations.push('Create class schedules to start enrollment')
  }

  if (!setupStatus.operations.members) {
    recommendations.push('Add your first members and start tracking attendance')
  }

  if (!setupStatus.operations.billing) {
    recommendations.push('Generate invoices and set up payment tracking')
  }

  if (recommendations.length === 0) {
    recommendations.push('Your club setup is complete! Consider enabling online payments and advanced features.')
  }

  return recommendations
}