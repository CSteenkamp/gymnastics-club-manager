import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { randomUUID } from 'crypto'

// POST - Create new club with admin user (signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clubName,
      clubEmail,
      clubPhone,
      clubAddress,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      planId
    } = body

    // Validation
    if (!clubName || !clubEmail || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All required fields must be provided'
      }, { status: 400 })
    }

    // Check if club email already exists
    const existingClub = await prisma.club.findUnique({
      where: { email: clubEmail }
    })

    if (existingClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A club with this email already exists'
      }, { status: 400 })
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A user with this email already exists'
      }, { status: 400 })
    }

    // Generate slug from club name
    const slug = clubName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug is unique
    let uniqueSlug = slug
    let counter = 1
    while (await prisma.club.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`
      counter++
    }

    // Set trial period (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    // Create club
    const clubId = randomUUID()
    const club = await prisma.club.create({
      data: {
        id: clubId,
        name: clubName,
        email: clubEmail,
        phone: clubPhone || null,
        address: clubAddress || null,
        slug: uniqueSlug,
        subscriptionStatus: 'TRIAL',
        subscriptionTier: 'BASIC',
        trialEndsAt,
        isActive: true,
        onboardingCompleted: false,
        updatedAt: new Date()
      }
    })

    // Hash admin password
    const hashedPassword = await hashPassword(adminPassword)

    // Create admin user
    const userId = randomUUID()
    const user = await prisma.user.create({
      data: {
        id: userId,
        clubId: club.id,
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        emailNotifications: true,
        smsNotifications: false,
        updatedAt: new Date()
      }
    })

    // If planId provided, create subscription
    if (planId) {
      const plan = await prisma.subscription_plans.findUnique({
        where: { id: planId }
      })

      if (plan) {
        const now = new Date()
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 14) // Trial period

        await prisma.subscriptions.create({
          data: {
            id: randomUUID(),
            clubId: club.id,
            planId: plan.id,
            status: 'TRIALING',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialStart: now,
            trialEnd: trialEndsAt,
            updatedAt: now
          }
        })
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      clubId: club.id,
      role: user.role
    })

    // Return success with token
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        club: {
          id: club.id,
          name: club.name,
          slug: club.slug,
          trialEndsAt: club.trialEndsAt
        },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        token
      },
      message: 'Club created successfully! Your 14-day trial has started.'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating club:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// GET - Get available subscription plans
export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.subscription_plans.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: plans
    })

  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
