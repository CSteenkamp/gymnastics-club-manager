import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'view' or 'download'

    // Find the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        clubId,
        isActive: true
      },
      include: {
        userDocuments: {
          where: { userId },
          select: {
            id: true,
            viewedAt: true,
            signedAt: true,
            isAcknowledged: true,
            signatureType: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // Check permissions
    if (userRole === 'PARENT' && !document.isPublic) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    // If this is a file download/view request
    if (action === 'download' || action === 'view') {
      const filePath = join(process.cwd(), document.filePath)
      
      if (!existsSync(filePath)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'File not found'
        }, { status: 404 })
      }

      // Log the view/download activity
      if (userRole === 'PARENT') {
        // Update user document to mark as viewed
        const userDocument = document.userDocuments[0]
        if (userDocument && !userDocument.viewedAt) {
          await prisma.userDocument.update({
            where: { id: userDocument.id },
            data: { 
              viewedAt: new Date(),
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          })
        } else if (!userDocument) {
          // Create user document record if it doesn't exist
          await prisma.userDocument.create({
            data: {
              userId,
              documentId,
              viewedAt: new Date(),
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          })
        }

        // Log data processing activity
        await prisma.dataProcessingLog.create({
          data: {
            clubId,
            userId,
            action: action === 'download' ? 'EXPORT' : 'READ',
            purpose: `User ${action === 'download' ? 'downloaded' : 'viewed'} document: ${document.title}`,
            dataTypes: ['document_content'],
            legalBasis: 'LEGITIMATE_INTERESTS',
            source: 'parent_portal',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            metadata: {
              documentId,
              fileName: document.fileName,
              action
            }
          }
        })
      }

      // Read and return the file
      const fileBuffer = await readFile(filePath)
      const headers = new Headers()
      
      headers.set('Content-Type', document.mimeType)
      headers.set('Content-Length', document.fileSize.toString())
      
      if (action === 'download') {
        headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`)
      } else {
        headers.set('Content-Disposition', `inline; filename="${document.fileName}"`)
      }

      return new NextResponse(fileBuffer, { headers })
    }

    // Return document metadata
    const userDocument = document.userDocuments[0]
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        description: document.description,
        category: document.category,
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        mimeType: document.mimeType,
        requiresSignature: document.requiresSignature,
        isPublic: document.isPublic,
        isMandatory: document.isMandatory,
        version: document.version,
        expiresAt: document.expiresAt,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        
        // User interaction data
        ...(userRole === 'PARENT' && {
          userDocument,
          isViewed: !!userDocument?.viewedAt,
          isSigned: !!userDocument?.signedAt,
          isAcknowledged: userDocument?.isAcknowledged || false
        })
      }
    })

  } catch (error: any) {
    console.error('Get document error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(
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

    // Only admins can update documents
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const documentId = params.id
    const body = await request.json()

    // Find existing document
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        clubId
      }
    })

    if (!existingDocument) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        requiresSignature: body.requiresSignature,
        isPublic: body.isPublic,
        isMandatory: body.isMandatory,
        dataProcessingPurpose: body.dataProcessingPurpose,
        retentionPeriod: body.retentionPeriod,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        updatedAt: new Date()
      }
    })

    // Log the update
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Document metadata updated',
        dataTypes: ['document_metadata'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          documentId,
          changes: {
            title: { from: existingDocument.title, to: body.title },
            category: { from: existingDocument.category, to: body.category }
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedDocument,
      message: 'Document updated successfully'
    })

  } catch (error: any) {
    console.error('Update document error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(
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

    // Only admins can delete documents
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const documentId = params.id

    // Find existing document
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        clubId
      }
    })

    if (!existingDocument) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Document not found'
      }, { status: 404 })
    }

    // Soft delete - mark as inactive
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    })

    // Log the deletion
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'DELETE',
        purpose: 'Document marked as deleted',
        dataTypes: ['document_metadata'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          documentId,
          fileName: existingDocument.fileName,
          title: existingDocument.title
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete document error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}