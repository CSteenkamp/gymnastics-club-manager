import { NextRequest, NextResponse } from 'next/server'
import { getUserNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET user's notification preferences
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    // Get user's current notification preferences
    const preferences = await getUserNotificationPreferences(payload.userId)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// UPDATE user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
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
    const { email, sms, whatsapp } = body

    // Validate input
    if (typeof email !== 'boolean' || typeof sms !== 'boolean') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid preferences format. email and sms must be boolean.'
      }, { status: 400 })
    }

    // Update preferences
    const success = await updateNotificationPreferences(payload.userId, {
      email,
      sms,
      whatsapp: whatsapp || false
    })

    if (!success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Failed to update preferences'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}