import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all expenses for a club
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
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      clubId: payload.clubId
    }

    if (category) {
      where.category = category
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: expenses
    })

  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new expense
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
      category,
      description,
      receipt,
      notes
    } = body

    if (!amount || !date || !category || !description) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        amount: new Decimal(amount),
        date: new Date(date),
        category,
        description,
        receipt: receipt || null,
        notes: notes || null,
        createdBy: payload.userId,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: expense,
      message: 'Expense created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
