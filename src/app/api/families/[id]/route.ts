import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const updateFamilySchema = z.object({
  familyName: z.string().min(1).optional(),
  primaryContact: z.string().optional(),
  communicationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    phone: z.boolean().optional(),
    preferredTime: z.string().optional()
  }).optional(),
  billingPreferences: z.object({
    billingAddress: z.string().optional(),
    paymentMethod: z.string().optional(),
    billingEmail: z.string().email().optional()
  }).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional()
  })).optional(),
  familyDiscount: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const family = await prisma.family.findFirst({
      where: {
        id: params.id,
        clubId
      },
      include: {
        children: {
          include: {
            parents: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            statusHistory: {
              orderBy: { effectiveDate: 'desc' },
              take: 5
            },
            activities: {
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            invoiceItems: {
              include: {
                invoice: {
                  select: {
                    id: true,
                    status: true,
                    total: true,
                    dueDate: true
                  }
                }
              },
              take: 10,
              orderBy: { invoice: { createdAt: 'desc' } }
            }
          }
        },
        primaryParent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!family) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Family not found'
      }, { status: 404 })
    }

    // Calculate family financial summary
    const financialSummary = await calculateFamilyFinancials(family.id, clubId)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...family,
        financialSummary
      }
    })

  } catch (error: any) {
    console.error('Get family error:', error)
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

    // Only admins can update families
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const family = await prisma.family.findFirst({
      where: {
        id: params.id,
        clubId
      }
    })

    if (!family) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Family not found'
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateFamilySchema.parse(body)

    // Validate primary contact if provided
    if (validatedData.primaryContact) {
      const parentExists = await prisma.user.findFirst({
        where: {
          id: validatedData.primaryContact,
          clubId,
          role: 'PARENT'
        }
      })

      if (!parentExists) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Primary contact not found or is not a parent'
        }, { status: 400 })
      }
    }

    const updatedFamily = await prisma.family.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        },
        primaryParent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Log the family update
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'UPDATE',
        purpose: 'Family information updated',
        dataTypes: ['family_data'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          familyId: updatedFamily.id,
          familyName: updatedFamily.familyName,
          updatedFields: Object.keys(validatedData)
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedFamily,
      message: 'Family updated successfully'
    })

  } catch (error: any) {
    console.error('Update family error:', error)
    
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

// Helper function to calculate family financial summary
async function calculateFamilyFinancials(familyId: string, clubId: string) {
  const [outstandingInvoices, totalPaid, monthlyFees] = await Promise.all([
    // Outstanding invoices for family members
    prisma.invoice.findMany({
      where: {
        clubId,
        status: { in: ['PENDING', 'OVERDUE'] },
        invoice_items: {
          some: {
            children: {
              familyId
            }
          }
        }
      },
      select: {
        id: true,
        total: true,
        status: true,
        dueDate: true
      }
    }),

    // Total payments made by family
    prisma.payment.aggregate({
      where: {
        clubId,
        status: 'COMPLETED',
        invoices: {
          invoice_items: {
            some: {
              children: {
                familyId
              }
            }
          }
        }
      },
      _sum: {
        amount: true
      }
    }),

    // Monthly fees for active family members
    prisma.child.findMany({
      where: {
        familyId,
        status: 'ACTIVE'
      },
      select: {
        monthlyFee: true
      }
    })
  ])

  const outstandingAmount = outstandingInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
  const totalMonthlyFees = monthlyFees.reduce((sum, child) => sum + (Number(child.monthlyFee) || 0), 0)
  const totalPaidAmount = Number(totalPaid._sum.amount) || 0

  return {
    outstandingAmount,
    outstandingInvoiceCount: outstandingInvoices.length,
    totalPaidThisYear: totalPaidAmount,
    monthlyFeesTotal: totalMonthlyFees,
    overdueInvoices: outstandingInvoices.filter(inv => inv.status === 'OVERDUE').length
  }
}

// Add/Remove children from family
export async function PATCH(
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

    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, childId } = body

    if (!['add', 'remove'].includes(action) || !childId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid action or missing childId'
      }, { status: 400 })
    }

    // Verify family exists
    const family = await prisma.family.findFirst({
      where: { id: params.id, clubId }
    })

    if (!family) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Family not found'
      }, { status: 404 })
    }

    // Verify child exists and belongs to club
    const child = await prisma.child.findFirst({
      where: { id: childId, clubId }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    let updatedChild
    if (action === 'add') {
      updatedChild = await prisma.child.update({
        where: { id: childId },
        data: { familyId: params.id }
      })
    } else {
      updatedChild = await prisma.child.update({
        where: { id: childId },
        data: { familyId: null }
      })
    }

    // Log the change
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        childId,
        action: 'UPDATE',
        purpose: `Child ${action === 'add' ? 'added to' : 'removed from'} family group`,
        dataTypes: ['family_data', 'child_profile'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          familyId: params.id,
          action,
          childName: `${child.firstName} ${child.lastName}`
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedChild,
      message: `Child ${action === 'add' ? 'added to' : 'removed from'} family successfully`
    })

  } catch (error: any) {
    console.error('Family child management error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}