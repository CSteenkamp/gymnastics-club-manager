import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { Decimal } from '@prisma/client/runtime/library'

// PUT - Update a fee structure
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { monthlyFee, description } = body

    // Verify fee structure belongs to this club
    const existing = await prisma.feeStructure.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee structure not found'
      }, { status: 404 })
    }

    const updated = await prisma.feeStructure.update({
      where: { id },
      data: {
        ...(monthlyFee !== undefined && { monthlyFee: new Decimal(monthlyFee) }),
        ...(description !== undefined && { description: description || null }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updated,
      message: 'Fee structure updated successfully'
    })

  } catch (error) {
    console.error('Error updating fee structure:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - Delete a fee structure
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify fee structure belongs to this club
    const existing = await prisma.feeStructure.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Fee structure not found'
      }, { status: 404 })
    }

    // Soft delete
    await prisma.feeStructure.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Fee structure deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting fee structure:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
