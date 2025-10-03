import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

// Validation schema for discount creation/update
const discountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').regex(/^[A-Z0-9_]+$/, 'Code must be uppercase with underscores/numbers'),
  type: z.enum(['FIXED_AMOUNT', 'PERCENTAGE', 'WAIVER']),
  value: z.number().positive('Value must be positive'),
  maxAmount: z.number().positive().optional(),
  feeTypeId: z.string().optional(),
  applicableLevels: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  usageLimit: z.number().positive().optional(),
  familyDiscount: z.boolean().optional(),
  siblingCount: z.number().min(2).optional(),
  description: z.string().optional()
})

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
    const feeTypeId = searchParams.get('feeTypeId')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const familyOnly = searchParams.get('familyOnly') === 'true'

    const where: any = {
      clubId
    }

    if (feeTypeId) {
      where.feeTypeId = feeTypeId
    }

    if (!includeInactive) {
      where.isActive = true
    }

    if (familyOnly) {
      where.familyDiscount = true
    }

    const discounts = await prisma.discount.findMany({
      where,
      include: {
        feeType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        applications: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: discounts
    })

  } catch (error: any) {
    console.error('Get discounts error:', error)
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

    // Only admins can create discounts
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = discountSchema.parse(body)

    // Check if code already exists for this club
    const existingDiscount = await prisma.discount.findUnique({
      where: {
        clubId_code: {
          clubId,
          code: validatedData.code
        }
      }
    })

    if (existingDiscount) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Discount with this code already exists'
      }, { status: 400 })
    }

    // Validate percentage discounts
    if (validatedData.type === 'PERCENTAGE' && validatedData.value > 100) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Percentage discount cannot exceed 100%'
      }, { status: 400 })
    }

    // Validate family discount
    if (validatedData.familyDiscount && !validatedData.siblingCount) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Sibling count is required for family discounts'
      }, { status: 400 })
    }

    const discount = await prisma.discount.create({
      data: {
        clubId,
        name: validatedData.name,
        code: validatedData.code,
        type: validatedData.type,
        value: validatedData.value,
        maxAmount: validatedData.maxAmount,
        feeTypeId: validatedData.feeTypeId,
        applicableLevels: validatedData.applicableLevels || [],
        validFrom: validatedData.validFrom ? new Date(validatedData.validFrom) : null,
        validTo: validatedData.validTo ? new Date(validatedData.validTo) : null,
        usageLimit: validatedData.usageLimit,
        familyDiscount: validatedData.familyDiscount || false,
        siblingCount: validatedData.siblingCount,
        description: validatedData.description
      },
      include: {
        feeType: true
      }
    })

    // Log the discount creation
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        purpose: 'Discount created',
        dataTypes: ['fee_management', 'discount_management'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          discountId: discount.id,
          discountName: discount.name,
          discountType: discount.type,
          value: discount.value
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: discount,
      message: 'Discount created successfully'
    })

  } catch (error: any) {
    console.error('Create discount error:', error)
    
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