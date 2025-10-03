import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const signDocumentSchema = z.object({
  signatureType: z.enum(['ELECTRONIC', 'DIGITAL', 'TYPED', 'DRAWN']),
  signature: z.string().min(1, 'Signature is required'),
  isAcknowledged: z.boolean().default(true),
  consentData: z.object({
    emailMarketing: z.boolean().optional(),
    smsMarketing: z.boolean().optional(),
    photoVideo: z.boolean().optional(),
    socialMedia: z.boolean().optional()
  }).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only parents can sign documents
    if (userRole !== 'PARENT') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Only parents can sign documents'
      }, { status: 403 })
    }

    const documentId = params.id
    const body = await request.json()
    const validatedData = signDocumentSchema.parse(body)

    // Find the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        clubId,
        isActive: true
      }
    })

    if (!document) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // Check if parent has access to this document
    if (!document.isPublic) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    // Check if document requires signature
    if (!document.requiresSignature) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'This document does not require a signature'
      }, { status: 400 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const signedAt = new Date()

    // Update or create user document record with signature
    const userDocument = await prisma.userDocument.upsert({
      where: {
        userId_documentId: {
          userId,
          documentId
        }
      },
      update: {
        signedAt,
        signature: validatedData.signature,
        signatureType: validatedData.signatureType,
        isAcknowledged: validatedData.isAcknowledged,
        ipAddress,
        userAgent,
        updatedAt: new Date()
      },
      create: {
        userId,
        documentId,
        viewedAt: new Date(), // Mark as viewed when signed
        signedAt,
        signature: validatedData.signature,
        signatureType: validatedData.signatureType,
        isAcknowledged: validatedData.isAcknowledged,
        ipAddress,
        userAgent
      }
    })

    // Create consent records if provided
    if (validatedData.consentData) {
      const consentTypes = [
        { type: 'MARKETING_EMAIL', value: validatedData.consentData.emailMarketing },
        { type: 'MARKETING_SMS', value: validatedData.consentData.smsMarketing },
        { type: 'PHOTO_VIDEO', value: validatedData.consentData.photoVideo },
        { type: 'SOCIAL_MEDIA', value: validatedData.consentData.socialMedia }
      ]

      for (const consent of consentTypes) {
        if (consent.value !== undefined) {
          await prisma.consentRecord.upsert({
            where: {
              userId_consentType: {
                userId,
                consentType: consent.type as any
              }
            },
            update: {
              isGranted: consent.value,
              grantedAt: consent.value ? signedAt : null,
              revokedAt: !consent.value ? signedAt : null,
              ipAddress,
              userAgent,
              version: '1.0',
              updatedAt: new Date()
            },
            create: {
              clubId,
              userId,
              documentId,
              consentType: consent.type as any,
              purpose: `Consent for ${consent.type.toLowerCase().replace('_', ' ')}`,
              isGranted: consent.value,
              grantedAt: consent.value ? signedAt : null,
              revokedAt: !consent.value ? signedAt : null,
              ipAddress,
              userAgent,
              version: '1.0',
              legalBasis: 'CONSENT'
            }
          })
        }
      }
    }

    // Log the signature activity
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: `Parent signed document: ${document.title}`,
        dataTypes: ['signature_data', 'consent_data'],
        legalBasis: 'CONSENT',
        source: 'parent_portal',
        ipAddress,
        userAgent,
        metadata: {
          documentId,
          signatureType: validatedData.signatureType,
          documentTitle: document.title,
          consentProvided: !!validatedData.consentData
        }
      }
    })

    // Get updated user document with relations for response
    const updatedUserDocument = await prisma.userDocument.findUnique({
      where: { id: userDocument.id },
      include: {
        document: {
          select: {
            title: true,
            category: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        userDocument: updatedUserDocument,
        signedAt,
        message: 'Document signed successfully'
      },
      message: 'Document signed successfully'
    })

  } catch (error: any) {
    console.error('Sign document error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid signature data',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id

    // Get signature status for this document
    const userDocument = await prisma.userDocument.findFirst({
      where: {
        userId,
        documentId
      },
      include: {
        document: {
          select: {
            title: true,
            category: true,
            requiresSignature: true
          }
        }
      }
    })

    // Get related consent records
    const consentRecords = await prisma.consentRecord.findMany({
      where: {
        userId,
        documentId
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        userDocument,
        consentRecords,
        isSigned: !!userDocument?.signedAt,
        signedAt: userDocument?.signedAt,
        signatureType: userDocument?.signatureType
      }
    })

  } catch (error: any) {
    console.error('Get signature status error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}