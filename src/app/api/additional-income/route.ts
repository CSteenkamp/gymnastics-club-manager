import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all additional income for a club
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
    const source = searchParams.get('source')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      clubId: payload.clubId
    }

    if (source) {
      where.source = source
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const additionalIncome = await prisma.additionalIncome.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: additionalIncome
    })

  } catch (error) {
    console.error('Error fetching additional income:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new additional income
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
      amount,
      date,
      source,
      description,
      notes
    } = body

    if (!amount || !date || !source || !description) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const additionalIncome = await prisma.additionalIncome.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        amount: new Decimal(amount),
        date: new Date(date),
        source,
        description,
        notes: notes || null,
        createdBy: payload.userId,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: additionalIncome,
      message: 'Additional income created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating additional income:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
