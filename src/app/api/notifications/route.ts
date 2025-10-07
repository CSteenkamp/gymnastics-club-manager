import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch notifications for current user
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
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    const where: any = {
      userId: payload.userId,
      clubId: payload.clubId
    }

    if (unreadOnly) {
      where.isRead = false
    }

    // Optionally filter out expired notifications
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } }
    ]

    const notifications = await prisma.notifications.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: notifications
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PATCH - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      await prisma.notifications.updateMany({
        where: {
          userId: payload.userId,
          clubId: payload.clubId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'All notifications marked as read'
      })
    }

    if (!notificationId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Notification ID is required'
      }, { status: 400 })
    }

    // Verify notification belongs to user
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        userId: payload.userId,
        clubId: payload.clubId
      }
    })

    if (!notification) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Notification not found'
      }, { status: 404 })
    }

    await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - Delete a notification
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Notification ID is required'
      }, { status: 400 })
    }

    // Verify notification belongs to user
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        userId: payload.userId,
        clubId: payload.clubId
      }
    })

    if (!notification) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Notification not found'
      }, { status: 404 })
    }

    await prisma.notifications.delete({
      where: { id: notificationId }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
