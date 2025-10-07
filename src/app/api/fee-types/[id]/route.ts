import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const updateFeeTypeSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_SESSION', 'PER_COMPETITION', 'PER_TERM']).optional(),
  description: z.string().optional(),
  isOptional: z.boolean().optional(),
  isActive: z.boolean().optional(),
  applicableLevels: z.array(z.string()).optional(),
  ageRestrictions: z.object({
    minAge: z.number().optional(),
    maxAge: z.number().optional()
  }).optional(),
  dateRestrictions: z.object({
    validFrom: z.string().optional(),
    validTo: z.string().optional()
  }).optional(),
  autoApply: z.boolean().optional(),
  applyConditions: z.object({
    newMembersOnly: z.boolean().optional(),
    competitionParticipants: z.boolean().optional(),
    specificLevels: z.array(z.string()).optional()
  }).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const feeType = await prisma.feeStructure.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        discounts: {
          where: { isActive: true },
          include: {
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
            }
          }
        }
      }
    })

    if (!feeType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee type not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeType
    })

  } catch (error: any) {
    console.error('Get fee type error:', error)
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

    // Only admins can update fee types
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const feeType = await prisma.feeStructure.findFirst({
      where: {
        id: params.id,
        clubId
      }
    })

    if (!feeType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee type not found'
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateFeeTypeSchema.parse(body)

    // Process date restrictions if provided
    let dateRestrictions = feeType.dateRestrictions
    if (validatedData.dateRestrictions) {
      dateRestrictions = {
        validFrom: validatedData.dateRestrictions.validFrom ? new Date(validatedData.dateRestrictions.validFrom) : null,
        validTo: validatedData.dateRestrictions.validTo ? new Date(validatedData.dateRestrictions.validTo) : null
      }
    }

    const updatedFeeType = await prisma.feeStructure.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        dateRestrictions,
        updatedAt: new Date()
      },
      include: {
        discounts: true
      }
    })

    // Log the fee type update
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Fee type updated',
        dataTypes: ['fee_management'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          feeTypeId: updatedFeeType.id,
          feeTypeName: updatedFeeType.name,
          updatedFields: Object.keys(validatedData)
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedFeeType,
      message: 'Fee type updated successfully'
    })

  } catch (error: any) {
    console.error('Update fee type error:', error)
    
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

    // Only admins can delete fee types
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const feeType = await prisma.feeStructure.findFirst({
      where: {
        id: params.id,
        clubId
      }
    })

    if (!feeType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee type not found'
      }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    const updatedFeeType = await prisma.feeStructure.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    // Log the fee type deletion
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Fee type deactivated',
        dataTypes: ['fee_management'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          feeTypeId: updatedFeeType.id,
          feeTypeName: updatedFeeType.name,
          action: 'soft_delete'
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Fee type deactivated successfully'
    })

  } catch (error: any) {
    console.error('Delete fee type error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}