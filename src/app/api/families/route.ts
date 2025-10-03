import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const createFamilySchema = z.object({
  familyName: z.string().min(1, 'Family name is required'),
  primaryContact: z.string().optional(),
  communicationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    phone: z.boolean().optional(),
    preferredTime: z.string().optional()
  }).optional(),
  billingPreferences: z.object({
    billingAddress: z.string().optional(),
    paymentMethod: z.string().optional(),
    billingEmail: z.string().email().optional()
  }).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional()
  })).optional(),
  familyDiscount: z.number().optional(),
  notes: z.string().optional()
})

const updateFamilySchema = createFamilySchema.partial()

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeMemberCount = searchParams.get('includeMemberCount') === 'true'

    const families = await prisma.family.findMany({
      where: {
        clubId,
        ...(includeInactive ? {} : { isActive: true })
      },
      include: {
        children: {
          where: {
            ...(includeInactive ? {} : { status: 'ACTIVE' })
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true,
            status: true,
            monthlyFee: true,
            joinDate: true
          }
        },
        primaryParent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        ...(includeMemberCount && {
          _count: {
            select: {
              children: true
            }
          }
        })
      },
      orderBy: {
        familyName: 'asc'
      }
    })

    // Calculate family statistics
    const familyStats = families.map(family => {
      const activeChildren = family.children.filter(child => child.status === 'ACTIVE')
      const totalMonthlyFees = activeChildren.reduce((sum, child) => sum + (Number(child.monthlyFee) || 0), 0)
      
      return {
        ...family,
        statistics: {
          totalChildren: family.children.length,
          activeChildren: activeChildren.length,
          totalMonthlyFees,
          averageFeePerChild: activeChildren.length > 0 ? totalMonthlyFees / activeChildren.length : 0
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: familyStats
    })

  } catch (error: any) {
    console.error('Get families error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only admins can create families
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createFamilySchema.parse(body)

    // Check if family name already exists
    const existingFamily = await prisma.family.findFirst({
      where: {
        clubId,
        familyName: validatedData.familyName
      }
    })

    if (existingFamily) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A family with this name already exists'
      }, { status: 400 })
    }

    // Validate primary contact exists if provided
    if (validatedData.primaryContact) {
      const parentExists = await prisma.user.findFirst({
        where: {
          id: validatedData.primaryContact,
          clubId,
          role: 'PARENT'
        }
      })

      if (!parentExists) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Primary contact not found or is not a parent'
        }, { status: 400 })
      }
    }

    const family = await prisma.family.create({
      data: {
        clubId,
        familyName: validatedData.familyName,
        primaryContact: validatedData.primaryContact,
        communicationPreferences: validatedData.communicationPreferences,
        billingPreferences: validatedData.billingPreferences,
        emergencyContacts: validatedData.emergencyContacts,
        familyDiscount: validatedData.familyDiscount,
        notes: validatedData.notes
      },
      include: {
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        },
        primaryParent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Log the family creation
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        purpose: 'Family group created',
        dataTypes: ['family_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          familyId: family.id,
          familyName: family.familyName
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: family,
      message: 'Family created successfully'
    })

  } catch (error: any) {
    console.error('Create family error:', error)
    
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