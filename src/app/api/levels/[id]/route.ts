import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// PUT - Update a level
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
    const { name, displayOrder, isActive } = body

    // Verify level belongs to this club
    const existingLevel = await prisma.level.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existingLevel) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Level not found'
      }, { status: 404 })
    }

    // If renaming, check for duplicates
    if (name && name !== existingLevel.name) {
      const duplicate = await prisma.level.findFirst({
        where: {
          clubId: payload.clubId,
          name,
          id: { not: id }
        }
      })

      if (duplicate) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'A level with this name already exists'
        }, { status: 400 })
      }
    }

    const updatedLevel = await prisma.level.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedLevel,
      message: 'Level updated successfully'
    })

  } catch (error) {
    console.error('Error updating level:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - Delete a level
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

    // Verify level belongs to this club
    const existingLevel = await prisma.level.findFirst({
      where: {
        id,
        clubId: payload.clubId
      }
    })

    if (!existingLevel) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Level not found'
      }, { status: 404 })
    }

    // Check if level is being used by any children
    const childrenCount = await prisma.child.count({
      where: {
        clubId: payload.clubId,
        level: existingLevel.name
      }
    })

    if (childrenCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Cannot delete level. It is currently assigned to ${childrenCount} member(s).`
      }, { status: 400 })
    }

    // Check if level is being used by any classes
    const classesCount = await prisma.class.count({
      where: {
        clubId: payload.clubId,
        level: existingLevel.name
      }
    })

    if (classesCount > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Cannot delete level. It is currently assigned to ${classesCount} class(es).`
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false instead of hard deleting
    await prisma.level.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Level deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting level:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
