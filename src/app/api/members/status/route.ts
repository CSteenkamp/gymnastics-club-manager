import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const statusChangeSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  newStatus: z.enum(['ACTIVE', 'INACTIVE', 'WITHDRAWN']),
  reason: z.string().optional(),
  effectiveDate: z.string().optional(),
  notes: z.string().optional(),
  notifyParents: z.boolean().default(false)
})

const bulkStatusChangeSchema = z.object({
  childIds: z.array(z.string()),
  newStatus: z.enum(['ACTIVE', 'INACTIVE', 'WITHDRAWN']),
  reason: z.string().optional(),
  effectiveDate: z.string().optional(),
  notes: z.string().optional(),
  notifyParents: z.boolean().default(false)
})

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

    // Only admins can change member status
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'bulk') {
      return await handleBulkStatusChange(body, userId, clubId)
    } else {
      return await handleSingleStatusChange(body, userId, clubId)
    }

  } catch (error: any) {
    console.error('Member status change error:', error)
    
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

async function handleSingleStatusChange(body: any, userId: string, clubId: string) {
  const validatedData = statusChangeSchema.parse(body)
  
  // Get current child data
  const child = await prisma.child.findFirst({
    where: {
      id: validatedData.childId,
      clubId
    },
    include: {
      parents: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  })

  if (!child) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Child not found'
    }, { status: 404 })
  }

  // Don't update if status is the same
  if (child.status === validatedData.newStatus) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Child already has this status'
    }, { status: 400 })
  }

  const effectiveDate = validatedData.effectiveDate 
    ? new Date(validatedData.effectiveDate)
    : new Date()

  // Use transaction to ensure consistency
  const result = await prisma.$transaction(async (tx) => {
    // Update child status
    const updatedChild = await tx.child.update({
      where: { id: validatedData.childId },
      data: {
        status: validatedData.newStatus,
        lastActiveDate: validatedData.newStatus === 'ACTIVE' ? new Date() : child.lastActiveDate,
        updatedAt: new Date()
      }
    })

    // Create status history record
    await tx.memberStatusHistory.create({
      data: {
        childId: validatedData.childId,
        fromStatus: child.status,
        toStatus: validatedData.newStatus,
        reason: validatedData.reason,
        effectiveDate,
        changedBy: userId,
        notes: validatedData.notes
      }
    })

    // Create activity record
    await tx.childActivity.create({
      data: {
        childId: validatedData.childId,
        type: 'STATUS_CHANGE',
        description: `Status changed from ${child.status} to ${validatedData.newStatus}`,
        oldValue: child.status,
        newValue: validatedData.newStatus,
        createdBy: userId
      }
    })

    // Log data processing
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId: validatedData.childId,
        action: 'UPDATE',
        purpose: 'Member status changed',
        dataTypes: ['child_profile', 'member_status'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          fromStatus: child.status,
          toStatus: validatedData.newStatus,
          reason: validatedData.reason,
          effectiveDate
        }
      }
    })

    return updatedChild
  })

  // TODO: Send notifications to parents if requested
  if (validatedData.notifyParents) {
    // This would integrate with the notification system
    console.log(`TODO: Notify parents of ${child.firstName} ${child.lastName} about status change`)
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: result,
    message: `Member status changed to ${validatedData.newStatus}`
  })
}

async function handleBulkStatusChange(body: any, userId: string, clubId: string) {
  const validatedData = bulkStatusChangeSchema.parse(body)
  
  // Validate all children exist and belong to club
  const children = await prisma.child.findMany({
    where: {
      id: { in: validatedData.childIds },
      clubId
    },
    include: {
      parents: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  })

  if (children.length !== validatedData.childIds.length) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'One or more children not found'
    }, { status: 404 })
  }

  const effectiveDate = validatedData.effectiveDate 
    ? new Date(validatedData.effectiveDate)
    : new Date()

  // Use transaction for bulk update
  const results = await prisma.$transaction(async (tx) => {
    const updatedChildren = []
    
    for (const child of children) {
      // Skip if already has the target status
      if (child.status === validatedData.newStatus) {
        continue
      }

      // Update child status
      const updatedChild = await tx.child.update({
        where: { id: child.id },
        data: {
          status: validatedData.newStatus,
          lastActiveDate: validatedData.newStatus === 'ACTIVE' ? new Date() : child.lastActiveDate,
          updatedAt: new Date()
        }
      })

      // Create status history record
      await tx.memberStatusHistory.create({
        data: {
          childId: child.id,
          fromStatus: child.status,
          toStatus: validatedData.newStatus,
          reason: validatedData.reason || 'Bulk status change',
          effectiveDate,
          changedBy: userId,
          notes: validatedData.notes
        }
      })

      // Create activity record
      await tx.childActivity.create({
        data: {
          childId: child.id,
          type: 'STATUS_CHANGE',
          description: `Status changed from ${child.status} to ${validatedData.newStatus} (bulk operation)`,
          oldValue: child.status,
          newValue: validatedData.newStatus,
          createdBy: userId
        }
      })

      updatedChildren.push(updatedChild)
    }

    // Log bulk data processing
    await tx.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Bulk member status change',
        dataTypes: ['child_profile', 'member_status'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          bulkOperation: true,
          childCount: updatedChildren.length,
          toStatus: validatedData.newStatus,
          reason: validatedData.reason,
          effectiveDate
        }
      }
    })

    return updatedChildren
  })

  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      updatedCount: results.length,
      skippedCount: validatedData.childIds.length - results.length,
      updatedChildren: results
    },
    message: `Bulk status change completed: ${results.length} members updated`
  })
}

// Get status history for a member
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
    const childId = searchParams.get('childId')

    if (!childId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child ID is required'
      }, { status: 400 })
    }

    // Verify child belongs to club
    const child = await prisma.child.findFirst({
      where: { id: childId, clubId }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    const statusHistory = await prisma.memberStatusHistory.findMany({
      where: { childId },
      orderBy: { effectiveDate: 'desc' }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: statusHistory
    })

  } catch (error: any) {
    console.error('Get status history error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}