import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all fee adjustments for a club
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    const where: any = {
      clubId: payload.clubId
    }

    if (childId) {
      where.childId = childId
    }

    const feeAdjustments = await prisma.feeAdjustment.findMany({
      where,
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeAdjustments
    })

  } catch (error) {
    console.error('Error fetching fee adjustments:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new fee adjustment
export async function POST(request: NextRequest) {
  try {
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
      childId,
      adjustmentType,
      amount,
      reason,
      effectiveFrom,
      effectiveTo,
      isRecurring
    } = body

    if (!childId || !adjustmentType || !amount || !reason || !effectiveFrom) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const feeAdjustment = await prisma.feeAdjustment.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        childId,
        adjustmentType,
        amount: new Decimal(amount),
        reason,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isRecurring: isRecurring !== undefined ? isRecurring : true,
        createdBy: payload.userId,
        updatedAt: new Date()
      },
      include: {
        child: {
          select: {
            firstName: true,
            lastName: true,
            level: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeAdjustment,
      message: 'Fee adjustment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating fee adjustment:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
