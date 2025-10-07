import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch available contacts for messaging
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

    // Parents can message coaches and admins
    // Coaches and admins can message everyone
    let contacts

    if (payload.role === 'PARENT') {
      // Parents can only message coaches and admins
      contacts = await prisma.user.findMany({
        where: {
          clubId: payload.clubId,
          id: { not: payload.userId },
          role: { in: ['COACH', 'ADMIN', 'FINANCE_ADMIN'] }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      })
    } else {
      // Coaches and admins can message everyone
      contacts = await prisma.user.findMany({
        where: {
          clubId: payload.clubId,
          id: { not: payload.userId }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: contacts
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
