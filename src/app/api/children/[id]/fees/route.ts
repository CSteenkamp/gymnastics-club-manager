import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentEffectiveMonthlyFee } from '@/lib/invoice'
import { ApiResponse } from '@/types'

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

    // Verify child exists and user has access
    const child = await prisma.child.findFirst({
      where: {
        id: params.id,
        clubId,
        ...(userRole === 'PARENT' && {
          parents: {
            some: {
              id: userId
            }
          }
        })
      },
      include: {
        feeAdjustments: {
          where: { isActive: true },
          orderBy: [
            { effectiveYear: 'desc' },
            { effectiveMonth: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        club: {
          include: {
            feeStructures: {
              where: {
                isActive: true,
                level: undefined // We'll filter this in code
              }
            }
          }
        }
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    // Get current effective fee
    const currentEffectiveFee = await getCurrentEffectiveMonthlyFee(params.id, clubId)

    // Get level default fee
    const levelDefault = child.club.feeStructures.find(fs => fs.level === child.level)?.monthlyFee

    // Get fee history for the last 12 months
    const now = new Date()
    const feeHistory = []
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = targetDate.getMonth() + 1
      const year = targetDate.getFullYear()
      
      // Find adjustment for this month
      const adjustment = child.feeAdjustments.find(adj => {
        if (adj.effectiveYear > year || (adj.effectiveYear === year && adj.effectiveMonth > month)) {
          return false // Not yet effective
        }
        
        if (adj.adjustmentType === 'PERMANENT') {
          return true // Permanent adjustments apply from effective date onwards
        }
        
        if (adj.adjustmentType === 'TEMPORARY') {
          // Check if within temporary period
          if (adj.expiryYear! < year || (adj.expiryYear === year && adj.expiryMonth! < month)) {
            return false // Expired
          }
          return true // Active temporary adjustment
        }
        
        return false
      })

      const effectiveFee = adjustment ? 
        Number(adjustment.adjustedFee) : 
        Number(child.monthlyFee || levelDefault || 0)

      feeHistory.push({
        month,
        year,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        effectiveFee,
        adjustment: adjustment ? {
          id: adjustment.id,
          type: adjustment.adjustmentType,
          reason: adjustment.reason,
          adjustedFee: Number(adjustment.adjustedFee)
        } : null
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        child: {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          level: child.level,
          baseMonthlyFee: Number(child.monthlyFee || 0),
          levelDefaultFee: Number(levelDefault || 0)
        },
        currentEffectiveFee: {
          amount: currentEffectiveFee.amount,
          adjustmentNote: currentEffectiveFee.adjustmentNote,
          adjustmentType: currentEffectiveFee.adjustmentType
        },
        activeAdjustments: child.feeAdjustments.map(adj => ({
          id: adj.id,
          type: adj.adjustmentType,
          originalFee: Number(adj.originalFee),
          adjustedFee: Number(adj.adjustedFee),
          reason: adj.reason,
          effectiveMonth: adj.effectiveMonth,
          effectiveYear: adj.effectiveYear,
          expiryMonth: adj.expiryMonth,
          expiryYear: adj.expiryYear,
          notes: adj.notes,
          appliedAt: adj.appliedAt
        })),
        feeHistory: feeHistory.reverse() // Most recent first
      }
    })

  } catch (error: any) {
    console.error('Get child fees error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}