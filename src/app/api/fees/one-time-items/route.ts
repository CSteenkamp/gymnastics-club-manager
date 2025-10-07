import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all one-time items for a club
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
    const isProcessed = searchParams.get('isProcessed')

    const where: any = {
      clubId: payload.clubId
    }

    if (isProcessed !== null) {
      where.isProcessed = isProcessed === 'true'
    }

    const oneTimeItems = await prisma.oneTimeItem.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: oneTimeItems
    })

  } catch (error) {
    console.error('Error fetching one-time items:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new one-time item
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
      userId,
      childId,
      description,
      amount,
      category,
      billingMonth,
      billingYear,
      notes
    } = body

    if (!userId || !description || !amount || !category || !billingMonth || !billingYear) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const oneTimeItem = await prisma.oneTimeItem.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        userId,
        childId: childId || null,
        description,
        amount: new Decimal(amount),
        category,
        billingMonth: parseInt(billingMonth),
        billingYear: parseInt(billingYear),
        notes: notes || null,
        isProcessed: false,
        createdBy: payload.userId,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: oneTimeItem,
      message: 'One-time item created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating one-time item:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
