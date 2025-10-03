import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'
import { PREDEFINED_THEMES, validateThemeColors } from '@/lib/branding/themes'

const updateBrandingSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().optional().or(z.literal('')),
  theme: z.enum(['DEFAULT', 'MODERN', 'CLASSIC', 'COLORFUL', 'MINIMAL', 'DARK', 'SPORT', 'CUSTOM']).optional(),
  colors: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    surface: z.string().optional(),
    text: z.string().optional(),
    textSecondary: z.string().optional(),
    success: z.string().optional(),
    warning: z.string().optional(),
    error: z.string().optional(),
    info: z.string().optional()
  }).optional(),
  customCss: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  bankingDetails: z.object({
    bankName: z.string().optional(),
    accountHolder: z.string().optional(),
    accountNumber: z.string().optional(),
    branchCode: z.string().optional(),
    swiftCode: z.string().optional()
  }).optional(),
  features: z.object({
    onlinePayments: z.boolean().optional(),
    documentSigning: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    reporting: z.boolean().optional(),
    multipleLocations: z.boolean().optional()
  }).optional()
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

    // Get club branding information
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        website: true,
        logo: true,
        favicon: true,
        colors: true,
        theme: true,
        customCss: true,
        registrationNumber: true,
        taxNumber: true,
        bankingDetails: true,
        settings: true,
        features: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiry: true
      }
    })

    if (!club) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    // Get predefined theme if using one
    const predefinedTheme = club.theme && club.theme !== 'CUSTOM' 
      ? PREDEFINED_THEMES[club.theme] 
      : null

    // Merge predefined theme colors with custom colors
    let effectiveColors = predefinedTheme?.colors || {}
    if (club.colors && typeof club.colors === 'object') {
      effectiveColors = { ...effectiveColors, ...(club.colors as any) }
    }

    const brandingData = {
      ...club,
      effectiveColors,
      predefinedTheme,
      availableThemes: Object.keys(PREDEFINED_THEMES).map(key => ({
        key,
        name: PREDEFINED_THEMES[key].name,
        colors: PREDEFINED_THEMES[key].colors
      }))
    }

    // Only return sensitive data to admins
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      delete brandingData.bankingDetails
      delete brandingData.subscriptionTier
      delete brandingData.subscriptionStatus
      delete brandingData.subscriptionExpiry
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: brandingData
    })

  } catch (error: any) {
    console.error('Get branding error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    // Only admins can update branding
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateBrandingSchema.parse(body)

    // Validate colors if provided
    if (validatedData.colors && !validateThemeColors(validatedData.colors)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid color values provided'
      }, { status: 400 })
    }

    // Get current club data
    const currentClub = await prisma.club.findUnique({
      where: { id: clubId }
    })

    if (!currentClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.website !== undefined) updateData.website = validatedData.website || null
    if (validatedData.theme) updateData.theme = validatedData.theme
    if (validatedData.customCss !== undefined) updateData.customCss = validatedData.customCss || null
    if (validatedData.registrationNumber !== undefined) updateData.registrationNumber = validatedData.registrationNumber || null
    if (validatedData.taxNumber !== undefined) updateData.taxNumber = validatedData.taxNumber || null

    // Handle colors - merge with existing
    if (validatedData.colors) {
      const existingColors = (currentClub.colors as any) || {}
      updateData.colors = { ...existingColors, ...validatedData.colors }
      
      // If switching to custom colors, set theme to CUSTOM
      if (validatedData.theme !== 'CUSTOM') {
        updateData.theme = 'CUSTOM'
      }
    }

    // Handle banking details - merge with existing
    if (validatedData.bankingDetails) {
      const existingBanking = (currentClub.bankingDetails as any) || {}
      updateData.bankingDetails = { ...existingBanking, ...validatedData.bankingDetails }
    }

    // Handle features - merge with existing
    if (validatedData.features) {
      const existingFeatures = (currentClub.features as any) || {}
      updateData.features = { ...existingFeatures, ...validatedData.features }
    }

    // Update club
    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: updateData
    })

    // Log the branding update
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Club branding settings updated',
        dataTypes: ['club_branding'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          updatedFields: Object.keys(updateData),
          theme: validatedData.theme
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedClub,
      message: 'Branding updated successfully'
    })

  } catch (error: any) {
    console.error('Update branding error:', error)
    
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