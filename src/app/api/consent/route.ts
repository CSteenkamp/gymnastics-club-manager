import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const updateConsentSchema = z.object({
  consentType: z.enum([
    'DATA_PROCESSING',
    'MARKETING_EMAIL', 
    'MARKETING_SMS',
    'PHOTO_VIDEO',
    'SOCIAL_MEDIA',
    'MEDICAL_TREATMENT',
    'EMERGENCY_CONTACT',
    'GENERAL_TERMS'
  ]),
  isGranted: z.boolean(),
  purpose: z.string().optional(),
  childId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    const consentType = searchParams.get('consentType')

    const whereClause: any = { clubId }

    // Parents can only see their own consent records
    if (userRole === 'PARENT') {
      whereClause.userId = userId
    } else {
      // Admins can see all consent records
      const targetUserId = searchParams.get('userId')
      if (targetUserId) {
        whereClause.userId = targetUserId
      }
    }

    if (childId) {
      whereClause.childId = childId
    }

    if (consentType) {
      whereClause.consentType = consentType
    }

    const consentRecords = await prisma.consentRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Group consent records by type for easier frontend consumption
    const groupedConsents = consentRecords.reduce((acc, record) => {
      if (!acc[record.consentType]) {
        acc[record.consentType] = []
      }
      acc[record.consentType].push(record)
      return acc
    }, {} as Record<string, typeof consentRecords>)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        consents: consentRecords,
        groupedConsents
      }
    })

  } catch (error: any) {
    console.error('Get consent records error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only parents can update their own consent
    if (userRole !== 'PARENT') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Only parents can manage their consent'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateConsentSchema.parse(body)

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const timestamp = new Date()

    // Create or update consent record
    const consentRecord = await prisma.consentRecord.upsert({
      where: {
        userId_consentType: {
          userId,
          consentType: validatedData.consentType
        }
      },
      update: {
        isGranted: validatedData.isGranted,
        grantedAt: validatedData.isGranted ? timestamp : null,
        revokedAt: !validatedData.isGranted ? timestamp : null,
        purpose: validatedData.purpose || `Consent for ${validatedData.consentType.toLowerCase().replace('_', ' ')}`,
        childId: validatedData.childId,
        ipAddress,
        userAgent,
        version: '1.0',
        updatedAt: timestamp
      },
      create: {
        clubId,
        userId,
        childId: validatedData.childId,
        consentType: validatedData.consentType,
        purpose: validatedData.purpose || `Consent for ${validatedData.consentType.toLowerCase().replace('_', ' ')}`,
        isGranted: validatedData.isGranted,
        grantedAt: validatedData.isGranted ? timestamp : null,
        revokedAt: !validatedData.isGranted ? timestamp : null,
        ipAddress,
        userAgent,
        version: '1.0',
        legalBasis: 'CONSENT'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        child: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Log the consent change
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId: validatedData.childId,
        action: 'UPDATE',
        purpose: `Consent ${validatedData.isGranted ? 'granted' : 'revoked'} for ${validatedData.consentType}`,
        dataTypes: ['consent_data'],
        legalBasis: 'CONSENT',
        source: 'parent_portal',
        ipAddress,
        userAgent,
        metadata: {
          consentType: validatedData.consentType,
          previousState: !validatedData.isGranted,
          newState: validatedData.isGranted,
          purpose: validatedData.purpose
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: consentRecord,
      message: `Consent ${validatedData.isGranted ? 'granted' : 'revoked'} successfully`
    })

  } catch (error: any) {
    console.error('Update consent error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid consent data',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}