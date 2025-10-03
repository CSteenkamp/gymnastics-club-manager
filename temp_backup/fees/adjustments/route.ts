import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const createFeeAdjustmentSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  adjustmentType: z.enum(['PERMANENT', 'TEMPORARY']),
  adjustedFee: z.number().min(0, 'Adjusted fee must be non-negative'),
  reason: z.string().min(1, 'Reason is required'),
  effectiveMonth: z.number().min(1).max(12, 'Month must be between 1 and 12'),
  effectiveYear: z.number().min(2020, 'Year must be valid'),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2020).optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
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

    // Only admins can view fee adjustments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    const adjustmentType = searchParams.get('adjustmentType')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      clubId
    }

    if (childId) {
      whereClause.childId = childId
    }

    if (adjustmentType) {
      whereClause.adjustmentType = adjustmentType
    }

    if (isActive !== null && isActive !== undefined) {
      whereClause.isActive = isActive === 'true'
    }

    // Get fee adjustments with pagination
    const [adjustments, totalCount] = await Promise.all([
      prisma.feeAdjustment.findMany({
        where: whereClause,
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              level: true,
              monthlyFee: true
            }
          }
        },
        orderBy: [
          { effectiveYear: 'desc' },
          { effectiveMonth: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.feeAdjustment.count({
        where: whereClause
      })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        adjustments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    })

  } catch (error: any) {
    console.error('Get fee adjustments error:', error)
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

    // Only admins can create fee adjustments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createFeeAdjustmentSchema.parse(body)

    // Validate temporary adjustments have expiry dates
    if (validatedData.adjustmentType === 'TEMPORARY') {
      if (!validatedData.expiryMonth || !validatedData.expiryYear) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Temporary adjustments must have expiry month and year'
        }, { status: 400 })
      }

      // Validate expiry is after effective date
      const effectiveDate = new Date(validatedData.effectiveYear, validatedData.effectiveMonth - 1)
      const expiryDate = new Date(validatedData.expiryYear, validatedData.expiryMonth - 1)
      
      if (expiryDate <= effectiveDate) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Expiry date must be after effective date'
        }, { status: 400 })
      }
    }

    // Verify child exists and belongs to club
    const child = await prisma.child.findFirst({
      where: {
        id: validatedData.childId,
        clubId
      },
      include: {
        club: {
          include: {
            feeStructures: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    // Get current/original fee
    const levelDefault = child.club.feeStructures.find(fs => fs.level === child.level)?.monthlyFee
    const originalFee = child.monthlyFee || levelDefault || 0

    // For permanent adjustments, deactivate any existing permanent adjustments
    if (validatedData.adjustmentType === 'PERMANENT') {
      await prisma.feeAdjustment.updateMany({
        where: {
          childId: validatedData.childId,
          clubId,
          adjustmentType: 'PERMANENT',
          isActive: true
        },
        data: {
          isActive: false
        }
      })

      // Update the child's monthlyFee field for permanent changes
      await prisma.child.update({
        where: { id: validatedData.childId },
        data: {
          monthlyFee: validatedData.adjustedFee
        }
      })
    }

    // Create the fee adjustment record
    const feeAdjustment = await prisma.feeAdjustment.create({
      data: {
        clubId,
        childId: validatedData.childId,
        adjustmentType: validatedData.adjustmentType,
        originalFee: Number(originalFee),
        adjustedFee: validatedData.adjustedFee,
        reason: validatedData.reason,
        effectiveMonth: validatedData.effectiveMonth,
        effectiveYear: validatedData.effectiveYear,
        expiryMonth: validatedData.expiryMonth,
        expiryYear: validatedData.expiryYear,
        appliedBy: userId,
        notes: validatedData.notes
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true
          }
        }
      }
    })

    // Log the fee adjustment
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId: validatedData.childId,
        action: 'CREATE',
        purpose: `Fee adjustment created: ${validatedData.adjustmentType}`,
        dataTypes: ['fee_data', 'child_profile'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          adjustmentId: feeAdjustment.id,
          adjustmentType: validatedData.adjustmentType,
          originalFee: Number(originalFee),
          adjustedFee: validatedData.adjustedFee,
          reason: validatedData.reason,
          effectiveDate: `${validatedData.effectiveYear}-${validatedData.effectiveMonth.toString().padStart(2, '0')}`,
          expiryDate: validatedData.expiryMonth ? `${validatedData.expiryYear}-${validatedData.expiryMonth.toString().padStart(2, '0')}` : null
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeAdjustment,
      message: `Fee adjustment created successfully for ${child.firstName} ${child.lastName}`
    })

  } catch (error: any) {
    console.error('Create fee adjustment error:', error)
    
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