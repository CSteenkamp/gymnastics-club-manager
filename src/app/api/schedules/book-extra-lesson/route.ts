import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

// Simple email sending function (you can replace with your email service)
async function sendEmailNotification(to: string, subject: string, html: string) {
  // For now, just log to console
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log('=== EMAIL NOTIFICATION ===')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('Body:', html)
  console.log('========================')

  // TODO: Implement actual email sending
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({ to, from: 'noreply@yourclub.com', subject, html })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authorization token required'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 })
    }

    const body = await request.json()
    const { scheduleId, childId } = body

    if (!scheduleId || !childId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule ID and Child ID are required'
      }, { status: 400 })
    }

    // Verify the child belongs to the user
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        parent: {
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

    if (child.parentId !== payload.userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'You do not have permission to book for this child'
      }, { status: 403 })
    }

    // Get schedule details
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        club: {
          select: {
            name: true,
            email: true
          }
        },
        coach: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            enrollments: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        childId_scheduleId: {
          childId,
          scheduleId
        }
      }
    })

    if (existingEnrollment && existingEnrollment.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child is already enrolled in this class'
      }, { status: 400 })
    }

    // Check capacity
    if (schedule._count.enrollments >= schedule.maxCapacity) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'This class is full'
      }, { status: 400 })
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        id: randomUUID(),
        clubId: payload.clubId,
        childId,
        scheduleId,
        isActive: true,
        notes: 'Booked as extra lesson via parent portal',
        updatedAt: new Date()
      }
    })

    // Send email notification to club admin
    const adminEmails = await prisma.user.findMany({
      where: {
        clubId: payload.clubId,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        emailNotifications: true
      },
      select: {
        email: true,
        firstName: true
      }
    })

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b5cf6;">Extra Lesson Booking Confirmation</h2>

        <p>Hello,</p>

        <p>A parent has booked an extra lesson:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Booking Details</h3>
          <p><strong>Parent:</strong> ${child.parent.firstName} ${child.parent.lastName} (${child.parent.email})</p>
          <p><strong>Child:</strong> ${child.firstName} ${child.lastName}</p>
          <p><strong>Class:</strong> ${schedule.name}</p>
          <p><strong>Level:</strong> ${schedule.level}</p>
          <p><strong>Day:</strong> ${schedule.dayOfWeek}</p>
          <p><strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}</p>
          <p><strong>Venue:</strong> ${schedule.venue}</p>
          ${schedule.coach ? `<p><strong>Coach:</strong> ${schedule.coach.firstName} ${schedule.coach.lastName}</p>` : ''}
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Note:</strong> This booking was made through the parent portal.
          Please confirm the details and add any necessary fees to the parent's invoice.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated notification from ${schedule.club.name}
        </p>
      </div>
    `

    // Send to all admins
    for (const admin of adminEmails) {
      await sendEmailNotification(
        admin.email,
        `Extra Lesson Booked: ${child.firstName} ${child.lastName} - ${schedule.name}`,
        emailHtml
      )
    }

    // Send confirmation email to club's main email if set
    if (schedule.club.email) {
      await sendEmailNotification(
        schedule.club.email,
        `Extra Lesson Booked: ${child.firstName} ${child.lastName} - ${schedule.name}`,
        emailHtml
      )
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        clubId: payload.clubId,
        userId: payload.userId,
        action: 'CREATE',
        entityType: 'ENROLLMENT',
        entityId: enrollment.id,
        changes: {
          scheduleId,
          childId,
          scheduleName: schedule.name,
          childName: `${child.firstName} ${child.lastName}`,
          type: 'extra_lesson_booking'
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enrollment,
      message: 'Extra lesson booked successfully! A confirmation email has been sent to the club administrators.'
    })

  } catch (error) {
    console.error('Error booking extra lesson:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to book extra lesson'
    }, { status: 500 })
  }
}
