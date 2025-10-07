import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const clubId = request.headers.get('x-club-id') || 'ceres-gymnastics'

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        colors: true,
        settings: true,
      }
    })

    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: club
    })
  } catch (error) {
    console.error('❌ Error fetching club branding:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch club branding' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clubId = request.headers.get('x-club-id') || 'ceres-gymnastics'
    const body = await request.json()

    const { logo, colors, settings } = body

    console.log('Updating branding for club:', clubId)
    console.log('Logo length:', logo?.length || 0)

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: {
        ...(logo !== undefined && { logo }),
        ...(colors !== undefined && { colors }),
        ...(settings !== undefined && { settings }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        colors: true,
        settings: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedClub
    })
  } catch (error: any) {
    console.error('❌ Error updating club branding:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update club branding' },
      { status: 500 }
    )
  }
}
