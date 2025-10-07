import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTrialEndingEmail } from '@/lib/email/emailService'

// This endpoint should be called by a cron job (e.g., Vercel Cron or external service)
// Run daily to check for trials ending soon

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const now = new Date()
    const warnings = []

    // Find clubs with trials ending in 7, 3, or 1 day(s)
    const warningDays = [7, 3, 1]

    for (const days of warningDays) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + days)
      targetDate.setHours(0, 0, 0, 0)

      const endOfTargetDate = new Date(targetDate)
      endOfTargetDate.setHours(23, 59, 59, 999)

      // Find clubs with trial ending on target date
      const clubs = await prisma.club.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: {
            gte: targetDate,
            lte: endOfTargetDate
          },
          isActive: true
        },
        include: {
          admins: {
            where: { role: 'ADMIN' },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      for (const club of clubs) {
        if (club.admins.length === 0 || !club.trialEndsAt) continue

        const admin = club.admins[0]
        const adminName = `${admin.firstName} ${admin.lastName}`.trim()

        // Check if we already sent a warning for this specific day count
        const existingWarning = await prisma.notifications.findFirst({
          where: {
            clubId: club.id,
            type: 'TRIAL_ENDING',
            metadata: {
              path: ['daysRemaining'],
              equals: days
            },
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })

        if (existingWarning) {
          console.log(`Already sent ${days}-day warning to ${club.name}`)
          continue
        }

        // Send email
        const emailResult = await sendTrialEndingEmail(admin.email, {
          clubName: club.name,
          adminName,
          daysRemaining: days,
          trialEndDate: club.trialEndsAt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }),
          subscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`
        })

        if (emailResult.success) {
          // Create notification record
          await prisma.notifications.create({
            data: {
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clubId: club.id,
              userId: null,
              type: 'TRIAL_ENDING',
              title: `Trial Ending in ${days} Day${days === 1 ? '' : 's'}`,
              message: `Your trial period ends on ${club.trialEndsAt.toLocaleDateString()}. Subscribe to continue using all features.`,
              isRead: false,
              metadata: {
                daysRemaining: days,
                emailSent: true,
                emailMessageId: emailResult.messageId
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          warnings.push({
            clubId: club.id,
            clubName: club.name,
            daysRemaining: days,
            emailSent: true
          })

          console.log(`Sent ${days}-day trial warning to ${club.name} (${admin.email})`)
        } else {
          warnings.push({
            clubId: club.id,
            clubName: club.name,
            daysRemaining: days,
            emailSent: false,
            error: 'Failed to send email'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      warnings,
      count: warnings.length,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Trial warning cron error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
