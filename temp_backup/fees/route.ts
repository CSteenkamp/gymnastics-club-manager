import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { feeStructureSchema } from '@/utils/validation'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const clubId = request.headers.get('x-club-id')

    if (!clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        clubId,
        isActive: true
      },
      orderBy: {
        level: 'asc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeStructures
    })

  } catch (error: any) {
    console.error('Get fee structures error:', error)
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

    // Only admins can create fee structures
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = feeStructureSchema.parse(body)
    const { level, monthlyFee, description } = validatedData

    // Check if fee structure already exists for this level
    const existingFee = await prisma.feeStructure.findFirst({
      where: {
        clubId,
        level,
        isActive: true
      }
    })

    if (existingFee) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee structure already exists for this level'
      }, { status: 400 })
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        clubId,
        level,
        monthlyFee,
        description
      }
    })

    // Log activity
    await prisma.auditLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        entity: 'FeeStructure',
        entityId: feeStructure.id,
        newValues: {
          level,
          monthlyFee: monthlyFee.toString(),
          description
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeStructure,
      message: 'Fee structure created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create fee structure error:', error)
    
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