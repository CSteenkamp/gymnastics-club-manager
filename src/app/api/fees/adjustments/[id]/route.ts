import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const updateFeeAdjustmentSchema = z.object({
  adjustedFee: z.number().min(0, 'Adjusted fee must be non-negative').optional(),
  reason: z.string().min(1, 'Reason is required').optional(),
  effectiveMonth: z.number().min(1).max(12, 'Month must be between 1 and 12').optional(),
  effectiveYear: z.number().min(2020, 'Year must be valid').optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(2020).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const feeAdjustment = await prisma.feeAdjustment.findFirst({
      where: {
        id: params.id,
        clubId
      },
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
      }
    })

    if (!feeAdjustment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee adjustment not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeAdjustment
    })

  } catch (error: any) {
    console.error('Get fee adjustment error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins can update fee adjustments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateFeeAdjustmentSchema.parse(body)

    // Get existing adjustment
    const existingAdjustment = await prisma.feeAdjustment.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        child: true
      }
    })

    if (!existingAdjustment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee adjustment not found'
      }, { status: 404 })
    }

    // Validate temporary adjustments have expiry dates if being updated
    if (existingAdjustment.adjustmentType === 'TEMPORARY') {
      const updatedExpiryMonth = validatedData.expiryMonth ?? existingAdjustment.expiryMonth
      const updatedExpiryYear = validatedData.expiryYear ?? existingAdjustment.expiryYear
      const updatedEffectiveMonth = validatedData.effectiveMonth ?? existingAdjustment.effectiveMonth
      const updatedEffectiveYear = validatedData.effectiveYear ?? existingAdjustment.effectiveYear

      if (!updatedExpiryMonth || !updatedExpiryYear) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Temporary adjustments must have expiry month and year'
        }, { status: 400 })
      }

      // Validate expiry is after effective date
      const effectiveDate = new Date(updatedEffectiveYear, updatedEffectiveMonth - 1)
      const expiryDate = new Date(updatedExpiryYear, updatedExpiryMonth - 1)
      
      if (expiryDate <= effectiveDate) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Expiry date must be after effective date'
        }, { status: 400 })
      }
    }

    // Update fee adjustment
    const updatedAdjustment = await prisma.feeAdjustment.update({
      where: { id: params.id },
      data: validatedData,
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

    // If this is a permanent adjustment and the adjusted fee changed, update child's monthly fee
    if (existingAdjustment.adjustmentType === 'PERMANENT' && 
        validatedData.adjustedFee && 
        validatedData.adjustedFee !== Number(existingAdjustment.adjustedFee)) {
      await prisma.child.update({
        where: { id: existingAdjustment.childId },
        data: {
          monthlyFee: validatedData.adjustedFee
        }
      })
    }

    // Log the update
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId: existingAdjustment.childId,
        action: 'UPDATE',
        purpose: 'Fee adjustment updated',
        dataTypes: ['fee_data', 'child_profile'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          adjustmentId: params.id,
          updatedFields: Object.keys(validatedData),
          oldValues: {
            adjustedFee: Number(existingAdjustment.adjustedFee),
            reason: existingAdjustment.reason,
            isActive: existingAdjustment.isActive
          },
          newValues: validatedData
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedAdjustment,
      message: 'Fee adjustment updated successfully'
    })

  } catch (error: any) {
    console.error('Update fee adjustment error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins can delete fee adjustments
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Get existing adjustment
    const existingAdjustment = await prisma.feeAdjustment.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        child: true
      }
    })

    if (!existingAdjustment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee adjustment not found'
      }, { status: 404 })
    }

    // For permanent adjustments, revert the child's monthly fee if possible
    if (existingAdjustment.adjustmentType === 'PERMANENT') {
      // Find the previous fee (either another permanent adjustment or the original fee)
      const previousAdjustment = await prisma.feeAdjustment.findFirst({
        where: {
          childId: existingAdjustment.childId,
          clubId,
          adjustmentType: 'PERMANENT',
          isActive: true,
          id: { not: params.id },
          OR: [
            { effectiveYear: { lt: existingAdjustment.effectiveYear } },
            {
              effectiveYear: existingAdjustment.effectiveYear,
              effectiveMonth: { lt: existingAdjustment.effectiveMonth }
            }
          ]
        },
        orderBy: [
          { effectiveYear: 'desc' },
          { effectiveMonth: 'desc' }
        ]
      })

      // Revert to previous adjustment or original fee
      const revertFee = previousAdjustment ? 
        Number(previousAdjustment.adjustedFee) : 
        Number(existingAdjustment.originalFee)

      await prisma.child.update({
        where: { id: existingAdjustment.childId },
        data: {
          monthlyFee: revertFee
        }
      })
    }

    // Delete the adjustment
    await prisma.feeAdjustment.delete({
      where: { id: params.id }
    })

    // Log the deletion
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId: existingAdjustment.childId,
        action: 'DELETE',
        purpose: 'Fee adjustment deleted',
        dataTypes: ['fee_data', 'child_profile'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          deletedAdjustmentId: params.id,
          adjustmentType: existingAdjustment.adjustmentType,
          originalFee: Number(existingAdjustment.originalFee),
          adjustedFee: Number(existingAdjustment.adjustedFee),
          reason: existingAdjustment.reason
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Fee adjustment deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete fee adjustment error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}