import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, type NotificationOptions } from '@/lib/notifications'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
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

    // Only admins can send notifications
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { type, recipients, data, subject, message, priority } = body

    // Validate required fields
    if (!type || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: type, recipients'
      }, { status: 400 })
    }

    // Send notification
    const notificationOptions: NotificationOptions = {
      type,
      recipients,
      data: data || {},
      subject,
      message,
      priority: priority || 'medium'
    }

    const result = await sendNotification(notificationOptions)

    return NextResponse.json<ApiResponse>({
      success: result.success,
      data: {
        emailsSent: result.emailsSent,
        smsSent: result.smsSent,
        errors: result.errors
      },
      message: result.success ? 'Notifications sent successfully' : 'Some notifications failed'
    })

  } catch (error) {
    console.error('Notification sending error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve notification templates and types
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

    // Return available notification types and their descriptions
    const notificationTypes = {
      invoice_generated: {
        name: 'Invoice Generated',
        description: 'Sent when a new invoice is created',
        requiredData: ['childName', 'invoiceNumber', 'amount', 'dueDate']
      },
      payment_received: {
        name: 'Payment Received',
        description: 'Sent when payment is successfully processed',
        requiredData: ['childName', 'amount', 'paymentDate', 'paymentMethod']
      },
      payment_overdue: {
        name: 'Payment Overdue',
        description: 'Sent when payment is past due date',
        requiredData: ['childName', 'amount', 'daysPastDue']
      },
      welcome: {
        name: 'Welcome Message',
        description: 'Sent to new families joining the club',
        requiredData: ['childName']
      },
      class_reminder: {
        name: 'Class Reminder',
        description: 'Reminder about upcoming classes',
        requiredData: ['childName', 'className', 'date', 'time']
      },
      class_cancelled: {
        name: 'Class Cancelled',
        description: 'Notification about cancelled classes',
        requiredData: ['childName', 'className', 'date', 'reason?']
      },
      general: {
        name: 'General Notification',
        description: 'Custom message for any purpose',
        requiredData: ['subject', 'message']
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        notificationTypes,
        supportedMethods: ['email', 'sms'],
        priorities: ['low', 'medium', 'high']
      }
    })

  } catch (error) {
    console.error('Error fetching notification info:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}