import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Only admins can upload branding assets
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'logo' or 'favicon'

    if (!file) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    if (!['logo', 'favicon'].includes(type)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid file type. Must be logo or favicon'
      }, { status: 400 })
    }

    // File validation
    const maxSize = type === 'favicon' ? 1024 * 1024 : 5 * 1024 * 1024 // 1MB for favicon, 5MB for logo
    if (file.size > maxSize) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `File size too large (max ${maxSize / (1024 * 1024)}MB)`
      }, { status: 400 })
    }

    // Allowed file types
    const allowedTypes = {
      logo: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      favicon: ['image/x-icon', 'image/png', 'image/svg+xml']
    }

    if (!allowedTypes[type as keyof typeof allowedTypes].includes(file.type)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Invalid file type for ${type}`
      }, { status: 400 })
    }

    // Generate filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const fileName = `${type}-${timestamp}.${extension}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'branding', clubId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const relativePath = join('uploads', 'branding', clubId, fileName)
    
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Update club record
    const updateData = type === 'logo' 
      ? { logo: relativePath }
      : { favicon: relativePath }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: updateData
    })

    // Log the upload
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: `Club ${type} uploaded`,
        dataTypes: ['club_branding', 'file_upload'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadType: type,
          savedPath: relativePath
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        [type]: relativePath,
        fileName,
        fileSize: file.size,
        fileType: file.type
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`
    })

  } catch (error: any) {
    console.error('Upload branding asset error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}