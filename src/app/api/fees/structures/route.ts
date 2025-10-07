import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all fee structures for a club
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

    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        clubId: payload.clubId,
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

  } catch (error) {
    console.error('Error fetching fee structures:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new fee structure
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
    const { level, monthlyFee, description } = body

    if (!level || monthlyFee === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Level and monthly fee are required'
      }, { status: 400 })
    }

    // Check if fee structure for this level already exists
    const existing = await prisma.feeStructure.findFirst({
      where: {
        clubId: payload.clubId,
        level
      }
    })

    if (existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A fee structure for this level already exists'
      }, { status: 400 })
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        level,
        monthlyFee: new Decimal(monthlyFee),
        description: description || null,
        isActive: true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: feeStructure,
      message: 'Fee structure created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating fee structure:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
