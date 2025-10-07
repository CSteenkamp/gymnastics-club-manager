import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// GET - Fetch all levels for a club
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

    // Fetch all fee structures (levels) for this club
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        clubId: payload.clubId,
        isActive: true
      },
      orderBy: {
        level: 'asc'
      }
    })

    // Map fee structures to level format
    const levels = feeStructures.map((fs, index) => ({
      id: fs.id,
      clubId: fs.clubId,
      name: fs.level,
      displayOrder: index,
      isActive: fs.isActive,
      createdAt: fs.createdAt,
      updatedAt: fs.updatedAt
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: levels
    })

  } catch (error) {
    console.error('Error fetching levels:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new level
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
    const { name, displayOrder } = body

    if (!name) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Level name is required'
      }, { status: 400 })
    }

    // Check if level with same name already exists
    const existing = await prisma.level.findFirst({
      where: {
        clubId: payload.clubId,
        name
      }
    })

    if (existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A level with this name already exists'
      }, { status: 400 })
    }

    // Get the highest displayOrder to add new level at the end
    const maxOrderLevel = await prisma.level.findFirst({
      where: { clubId: payload.clubId },
      orderBy: { displayOrder: 'desc' }
    })

    const newDisplayOrder = displayOrder !== undefined
      ? displayOrder
      : (maxOrderLevel?.displayOrder ?? -1) + 1

    const level = await prisma.level.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        name,
        displayOrder: newDisplayOrder,
        isActive: true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: level,
      message: 'Level created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating level:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
