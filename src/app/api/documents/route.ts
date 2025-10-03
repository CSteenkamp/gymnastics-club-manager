import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const uploadDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum([
    'GENERAL',
    'POLICY',
    'TERMS_CONDITIONS',
    'PRIVACY_POLICY',
    'CONSENT_FORM',
    'MEDICAL_FORM',
    'PHOTO_VIDEO_CONSENT',
    'EMERGENCY_CONTACT',
    'WAIVER',
    'REGISTRATION',
    'POPI_NOTICE',
    'DATA_PROCESSING_AGREEMENT'
  ]),
  requiresSignature: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  isMandatory: z.boolean().default(false),
  dataProcessingPurpose: z.string().optional(),
  retentionPeriod: z.number().optional(),
  expiresAt: z.string().optional()
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
    const category = searchParams.get('category')
    const isPublic = searchParams.get('isPublic')
    const isMandatory = searchParams.get('isMandatory')

    // Build where clause
    const whereClause: any = {
      clubId,
      isActive: true
    }

    // Parents can only see public documents or documents they have access to
    if (userRole === 'PARENT') {
      whereClause.isPublic = true
    }

    // Add filters
    if (category) {
      whereClause.category = category
    }
    
    if (isPublic !== null) {
      whereClause.isPublic = isPublic === 'true'
    }
    
    if (isMandatory !== null) {
      whereClause.isMandatory = isMandatory === 'true'
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        userDocuments: userRole === 'PARENT' ? {
          where: { userId },
          select: {
            id: true,
            viewedAt: true,
            signedAt: true,
            isAcknowledged: true,
            signatureType: true
          }
        } : false,
        _count: userRole !== 'PARENT' ? {
          select: {
            userDocuments: {
              where: { signedAt: { not: null } }
            }
          }
        } : false
      },
      orderBy: [
        { isMandatory: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Format response based on user role
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      requiresSignature: doc.requiresSignature,
      isPublic: doc.isPublic,
      isMandatory: doc.isMandatory,
      version: doc.version,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      
      // Parent-specific data
      ...(userRole === 'PARENT' && {
        userDocument: doc.userDocuments?.[0] || null,
        isViewed: !!doc.userDocuments?.[0]?.viewedAt,
        isSigned: !!doc.userDocuments?.[0]?.signedAt,
        isAcknowledged: doc.userDocuments?.[0]?.isAcknowledged || false
      }),
      
      // Admin-specific data
      ...(userRole !== 'PARENT' && {
        signedCount: doc._count?.userDocuments || 0,
        dataProcessingPurpose: doc.dataProcessingPurpose,
        retentionPeriod: doc.retentionPeriod
      })
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedDocuments
    })

  } catch (error: any) {
    console.error('Get documents error:', error)
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

    // Only admins can upload documents
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentData = JSON.parse(formData.get('data') as string)

    if (!file) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate document data
    const validatedData = uploadDocumentSchema.parse(documentData)

    // File validation
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'File size too large (max 10MB)'
      }, { status: 400 })
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'File type not allowed'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name
    const extension = originalName.split('.').pop()
    const fileName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'documents', clubId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const relativePath = join('uploads', 'documents', clubId, fileName)
    
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Create document record
    const document = await prisma.document.create({
      data: {
        clubId,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        fileName: originalName,
        fileSize: file.size,
        fileType: extension || '',
        mimeType: file.type,
        filePath: relativePath,
        requiresSignature: validatedData.requiresSignature,
        isPublic: validatedData.isPublic,
        isMandatory: validatedData.isMandatory,
        dataProcessingPurpose: validatedData.dataProcessingPurpose,
        retentionPeriod: validatedData.retentionPeriod,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        createdBy: userId
      }
    })

    // Log the document creation
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'CREATE',
        purpose: 'Document uploaded for club administration',
        dataTypes: ['document_metadata'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          documentId: document.id,
          fileName: originalName,
          category: validatedData.category
        }
      }
    })

    // If it's a mandatory document, create user document records for all parents
    if (validatedData.isMandatory || validatedData.isPublic) {
      const parents = await prisma.user.findMany({
        where: {
          clubId,
          role: 'PARENT',
          isActive: true
        },
        select: { id: true }
      })

      if (parents.length > 0) {
        await prisma.userDocument.createMany({
          data: parents.map(parent => ({
            userId: parent.id,
            documentId: document.id
          }))
        })
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Upload document error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid input data',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}