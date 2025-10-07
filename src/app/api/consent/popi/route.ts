import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch POPI consent for current user and their children
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
    const childId = searchParams.get('childId')

    const where: any = {
      clubId: payload.clubId,
      userId: payload.userId,
      consentType: 'POPI_ANNUAL'
    }

    if (childId) {
      where.childId = childId
    }

    const consents = await prisma.consentRecord.findMany({
      where,
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: consents
    })

  } catch (error) {
    console.error('Error fetching POPI consents:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Create/Update POPI consent
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
    const {
      childId,
      participationConsent,
      dataProcessingConsent,
      mediaConsent,
      emergencyMedicalConsent,
      doctorName,
      doctorPhone,
      medicalAidName,
      medicalAidNumber,
      allergies,
      medications,
      signatureData,
      signedByName
    } = body

    // Validate required fields
    if (!childId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child ID is required'
      }, { status: 400 })
    }

    // Check if child belongs to user
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        clubId: payload.clubId,
        parentId: payload.userId
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found or does not belong to you'
      }, { status: 404 })
    }

    // Check for existing consent this year
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)

    const existingConsent = await prisma.consentRecord.findFirst({
      where: {
        clubId: payload.clubId,
        userId: payload.userId,
        childId,
        consentType: 'POPI_ANNUAL',
        grantedAt: {
          gte: yearStart,
          lte: yearEnd
        }
      }
    })

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const consentData = {
      clubId: payload.clubId,
      userId: payload.userId,
      childId,
      consentType: 'POPI_ANNUAL' as const,
      purpose: 'Annual POPI Act Consent - Gymnastics Participation & Data Processing',
      isGranted: participationConsent && dataProcessingConsent && emergencyMedicalConsent,
      grantedAt: new Date(),
      expiresAt: yearEnd, // Expires at end of current year
      ipAddress,
      userAgent,
      version: `${currentYear}`,
      legalBasis: 'CONSENT' as const,
      participationConsent,
      dataProcessingConsent,
      mediaConsent,
      emergencyMedicalConsent,
      doctorName,
      doctorPhone,
      medicalAidName,
      medicalAidNumber,
      allergies,
      medications,
      signatureData,
      signedByName
    }

    let consent
    if (existingConsent) {
      // Update existing consent
      consent = await prisma.consentRecord.update({
        where: { id: existingConsent.id },
        data: consentData,
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    } else {
      // Create new consent
      consent = await prisma.consentRecord.create({
        data: consentData,
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: consent,
      message: 'POPI consent saved successfully'
    }, { status: existingConsent ? 200 : 201 })

  } catch (error) {
    console.error('Error saving POPI consent:', error)

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
