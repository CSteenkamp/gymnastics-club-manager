import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/notifications/email'
import { sendSMS } from '@/lib/notifications/sms'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin only)
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
    const { type, to, message } = body

    if (!type || !to) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: type, to'
      }, { status: 400 })
    }

    const results: any = {}

    if (type === 'email' || type === 'both') {
      // Test email
      const emailResult = await sendEmail({
        to: to,
        subject: 'Test Email from Ceres Gymnastics Club',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">🧪 Test Email</h1>
              <p style="margin: 10px 0 0 0;">Ceres Gymnastics Club Notification System</p>
            </div>
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333;">Email System Test</h2>
              <p style="color: #555; line-height: 1.6;">
                This is a test email to verify that the notification system is working correctly.
              </p>
              <p style="color: #555; line-height: 1.6;">
                <strong>Test Message:</strong> ${message || 'No custom message provided'}
              </p>
              <p style="color: #555; line-height: 1.6;">
                <strong>Timestamp:</strong> ${new Date().toLocaleString()}
              </p>
              <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2c5aa0;">
                  ✅ If you received this email, the notification system is working properly!
                </p>
              </div>
            </div>
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                Ceres Gymnastics Club Management System<br>
                <small>This is a test message from the notification system</small>
              </p>
            </div>
          </div>
        `,
        text: `
Test Email from Ceres Gymnastics Club

This is a test email to verify that the notification system is working correctly.

Test Message: ${message || 'No custom message provided'}
Timestamp: ${new Date().toLocaleString()}

If you received this email, the notification system is working properly!

Ceres Gymnastics Club Management System
        `
      })
      
      results.email = {
        sent: emailResult,
        recipient: to
      }
    }

    if (type === 'sms' || type === 'both') {
      // Test SMS
      const smsResult = await sendSMS({
        to: to,
        message: `Test SMS from Ceres Gymnastics Club: ${message || 'Notification system test'} - ${new Date().toLocaleString()}`
      })
      
      results.sms = {
        sent: smsResult.success,
        messageId: smsResult.messageId,
        error: smsResult.error,
        cost: smsResult.cost,
        recipient: to
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: results,
      message: 'Test notifications sent'
    })

  } catch (error) {
    console.error('Test notification error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to check notification system configuration
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (admin only)
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

    // Check configuration status
    const emailConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
    const smsConfigured = !!(process.env.SMS_PROVIDER && process.env.SMS_API_KEY)
    
    const smsProvider = process.env.SMS_PROVIDER?.toLowerCase()
    const smsProviderConfigured = smsProvider === 'clickatell' 
      ? !!(process.env.SMS_API_KEY)
      : smsProvider === 'bulksms' 
        ? !!(process.env.SMS_USERNAME && process.env.SMS_API_KEY)
        : false

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        email: {
          configured: emailConfigured,
          host: process.env.EMAIL_HOST || 'Not configured',
          user: process.env.EMAIL_USER ? '✓ Configured' : '✗ Not configured',
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not configured'
        },
        sms: {
          configured: smsConfigured && smsProviderConfigured,
          provider: process.env.SMS_PROVIDER || 'Not configured',
          apiKey: process.env.SMS_API_KEY ? '✓ Configured' : '✗ Not configured',
          username: smsProvider === 'bulksms' 
            ? (process.env.SMS_USERNAME ? '✓ Configured' : '✗ Not configured')
            : 'Not required'
        },
        recommendations: [
          !emailConfigured && 'Configure email settings in environment variables',
          !smsConfigured && 'Configure SMS provider settings in environment variables',
          'Test both email and SMS before going live'
        ].filter(Boolean)
      }
    })

  } catch (error) {
    console.error('Error checking notification config:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}