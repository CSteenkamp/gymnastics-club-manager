import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

// GET - Fetch all events for a club
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
    const eventType = searchParams.get('eventType')
    const upcoming = searchParams.get('upcoming')

    const where: any = {
      clubId: payload.clubId
    }

    if (eventType) {
      where.eventType = eventType
    }

    if (upcoming === 'true') {
      where.date = {
        gte: new Date()
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        registrations: {
          select: {
            id: true,
            childId: true,
            status: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: events
    })

  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create a new event
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
      title,
      description,
      eventType,
      date,
      endDate,
      location,
      registrationDeadline,
      maxParticipants,
      cost,
      isPublic,
      targetLevels,
      notes
    } = body

    if (!title || !eventType || !date) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const event = await prisma.event.create({
      data: {
        id: uuidv4(),
        clubId: payload.clubId,
        title,
        description: description || null,
        eventType,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        cost: cost ? new Decimal(cost) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
        targetLevels: targetLevels || [],
        notes: notes || null,
        createdBy: payload.userId,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: event,
      message: 'Event created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
