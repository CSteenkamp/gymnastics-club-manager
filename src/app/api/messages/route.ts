import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { randomUUID } from 'crypto'

// GET - Fetch messages for a user (inbox/sent)
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
    const folder = searchParams.get('folder') || 'inbox'

    let messages
    if (folder === 'sent') {
      // Get sent messages
      messages = await prisma.messages.findMany({
        where: {
          clubId: payload.clubId,
          senderId: payload.userId
        },
        include: {
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } else {
      // Get inbox messages
      messages = await prisma.messages.findMany({
        where: {
          clubId: payload.clubId,
          recipientId: payload.userId
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Send a new message
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
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId, subject, body: messageBody } = body

    if (!subject || !messageBody) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Subject and message body are required'
      }, { status: 400 })
    }

    // If recipientId is provided, send to specific user
    // If not provided, it's a broadcast message (admin/coach to all parents)
    if (recipientId) {
      // Verify recipient exists and belongs to the same club
      const recipient = await prisma.user.findFirst({
        where: {
          id: recipientId,
          clubId: payload.clubId
        }
      })

      if (!recipient) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Recipient not found'
        }, { status: 404 })
      }
    }

    const message = await prisma.messages.create({
      data: {
        id: randomUUID(),
        clubId: payload.clubId,
        senderId: payload.userId,
        recipientId: recipientId || null,
        subject,
        body: messageBody,
        updatedAt: new Date()
      },
      include: {
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: message,
      message: 'Message sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PATCH - Mark message as read
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
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Message ID is required'
      }, { status: 400 })
    }

    // Verify message belongs to user
    const message = await prisma.messages.findFirst({
      where: {
        id: messageId,
        clubId: payload.clubId,
        recipientId: payload.userId
      }
    })

    if (!message) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Message not found'
      }, { status: 404 })
    }

    const updatedMessage = await prisma.messages.update({
      where: { id: messageId },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedMessage
    })

  } catch (error) {
    console.error('Error marking message as read:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
