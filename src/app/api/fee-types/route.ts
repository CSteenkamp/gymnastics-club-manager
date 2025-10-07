import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

// Validation schema for fee type creation/update
const feeTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').regex(/^[A-Z_]+$/, 'Code must be uppercase with underscores'),
  category: z.enum(['MONTHLY_FEE', 'REGISTRATION', 'EQUIPMENT', 'CLOTHING', 'COMPETITION', 'TRAVEL', 'ASSESSMENT', 'COACHING', 'ADMINISTRATION', 'INSURANCE', 'FACILITY', 'OTHER']),
  amount: z.number().positive('Amount must be positive'),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_SESSION', 'PER_COMPETITION', 'PER_TERM']).optional(),
  description: z.string().optional(),
  isOptional: z.boolean().optional(),
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
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {
      clubId
    }

    if (category) {
      where.category = category
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const feeTypes = await prisma.feeStructure.findMany({
      where: {
        clubId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [
        { level: 'asc' }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeTypes
    })

  } catch (error: any) {
    console.error('Get fee types error:', error)
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

    // Only admins can create fee types
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = feeTypeSchema.parse(body)

    // Check if code already exists for this club
    const existingFeeType = await prisma.feeStructure.findUnique({
      where: {
        clubId_code: {
          clubId,
          code: validatedData.code
        }
      }
    })

    if (existingFeeType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee type with this code already exists'
      }, { status: 400 })
    }

    // Process date restrictions
    let dateRestrictions = null
    if (validatedData.dateRestrictions) {
      dateRestrictions = {
        validFrom: validatedData.dateRestrictions.validFrom ? new Date(validatedData.dateRestrictions.validFrom) : null,
        validTo: validatedData.dateRestrictions.validTo ? new Date(validatedData.dateRestrictions.validTo) : null
      }
    }

    const feeType = await prisma.feeStructure.create({
      data: {
        clubId,
        name: validatedData.name,
        code: validatedData.code,
        category: validatedData.category,
        amount: validatedData.amount,
        frequency: validatedData.frequency || 'ONE_TIME',
        description: validatedData.description,
        isOptional: validatedData.isOptional || false,
        applicableLevels: validatedData.applicableLevels || [],
        ageRestrictions: validatedData.ageRestrictions || null,
        dateRestrictions,
        autoApply: validatedData.autoApply || false,
        applyConditions: validatedData.applyConditions || null
      },
      include: {
        discounts: true
      }
    })

    // Log the fee type creation
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        purpose: 'Fee type created',
        dataTypes: ['fee_management'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          feeTypeId: feeType.id,
          feeTypeName: feeType.name,
          category: feeType.category
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeType,
      message: 'Fee type created successfully'
    })

  } catch (error: any) {
    console.error('Create fee type error:', error)
    
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