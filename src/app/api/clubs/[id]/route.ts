import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET a specific club
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
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

    // Super admin can view any club, regular users can only view their own club
    if (payload.role !== 'SUPER_ADMIN' && payload.clubId !== params.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    const club = await prisma.club.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            users: true,
            children: true,
            invoices: true,
            schedules: true,
            payments: true
          }
        }
      }
    })

    if (!club) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: club
    })

  } catch (error) {
    console.error('Error fetching club:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// UPDATE a club
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
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

    // Super admin can edit any club, club admins can edit their own club
    const canEdit = payload.role === 'SUPER_ADMIN' || 
                   (payload.clubId === params.id && ['ADMIN', 'FINANCE_ADMIN'].includes(payload.role))

    if (!canEdit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    // Check if club exists
    const existingClub = await prisma.club.findUnique({
      where: { id: params.id }
    })

    if (!existingClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      logo,
      colors,
      settings,
      isActive
    } = body

    // Check if email is being changed and if it conflicts
    if (email && email !== existingClub.email) {
      const emailConflict = await prisma.club.findFirst({
        where: {
          email,
          id: { not: params.id }
        }
      })

      if (emailConflict) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'A club with this email already exists'
        }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (logo !== undefined) updateData.logo = logo
    if (colors !== undefined) updateData.colors = colors
    if (settings !== undefined) updateData.settings = settings
    if (isActive !== undefined && payload.role === 'SUPER_ADMIN') {
      updateData.isActive = isActive
    }

    const updatedClub = await prisma.club.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
            children: true,
            invoices: true,
            schedules: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedClub,
      message: 'Club updated successfully'
    })

  } catch (error) {
    console.error('Error updating club:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE a club (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication (super admin only)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    // Check if club exists
    const existingClub = await prisma.club.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
            invoices: true,
            payments: true
          }
        }
      }
    })

    if (!existingClub) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    // Check if club has data (prevent accidental deletion)
    const hasData = existingClub._count.users > 0 || 
                   existingClub._count.children > 0 || 
                   existingClub._count.invoices > 0 || 
                   existingClub._count.payments > 0

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (hasData && !force) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club has existing data. Use ?force=true to delete anyway.',
        data: {
          counts: existingClub._count
        }
      }, { status: 400 })
    }

    // Delete club (cascade will handle related records)
    await prisma.club.delete({
      where: { id: params.id }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Club deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting club:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}