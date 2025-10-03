import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // Filter by transaction type
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Parents can only view their own transactions
    if (userRole === 'PARENT' && targetUserId && targetUserId !== userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const queryUserId = targetUserId || userId
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      clubId,
      userId: queryUserId
    }

    if (type) {
      whereClause.type = type
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo)
      }
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              reference: true,
              status: true
            }
          }
        }
      }),
      prisma.creditTransaction.count({
        where: whereClause
      })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    })

  } catch (error: any) {
    console.error('Get credit transactions error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Reverse a credit transaction (admin only)
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

    // Only admins can reverse transactions
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const body = await request.json()
    const { transactionId, reason } = body

    if (!transactionId || !reason) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction ID and reason are required'
      }, { status: 400 })
    }

    // Get original transaction
    const originalTransaction = await prisma.creditTransaction.findFirst({
      where: {
        id: transactionId,
        clubId
      },
      include: {
        creditAccount: true
      }
    })

    if (!originalTransaction) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction not found'
      }, { status: 404 })
    }

    if (originalTransaction.isReversed) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction is already reversed'
      }, { status: 400 })
    }

    // Reverse the transaction
    const result = await prisma.$transaction(async (tx) => {
      const creditAccount = originalTransaction.creditAccount
      const balanceBefore = Number(creditAccount.currentBalance)
      
      // Calculate new balance (reverse the original transaction)
      let balanceAfter: number
      let reversalAmount: number
      let reversalType: string

      if (originalTransaction.type === 'CREDIT_ADDED') {
        // Reverse credit addition (subtract from balance)
        reversalAmount = Number(originalTransaction.amount)
        balanceAfter = balanceBefore - reversalAmount
        reversalType = 'CREDIT_REVERSED'
      } else if (originalTransaction.type === 'CREDIT_USED') {
        // Reverse credit usage (add back to balance)
        reversalAmount = Number(originalTransaction.amount)
        balanceAfter = balanceBefore + reversalAmount
        reversalType = 'CREDIT_REVERSED'
      } else {
        throw new Error('Cannot reverse this transaction type')
      }

      // Check if reversal would create negative balance for credit additions
      if (originalTransaction.type === 'CREDIT_ADDED' && balanceAfter < 0) {
        throw new Error('Cannot reverse: would create negative balance')
      }

      // Create reversal transaction
      const reversalTransaction = await tx.creditTransaction.create({
        data: {
          clubId,
          creditAccountId: creditAccount.id,
          userId: originalTransaction.userId,
          type: reversalType as any,
          amount: reversalAmount,
          balanceBefore,
          balanceAfter,
          description: `Reversal of transaction: ${originalTransaction.description}`,
          reference: originalTransaction.id,
          source: 'SYSTEM_ADJUSTMENT',
          approvedBy: userId,
          metadata: {
            originalTransactionId: originalTransaction.id,
            reversalReason: reason
          }
        }
      })

      // Mark original transaction as reversed
      await tx.creditTransaction.update({
        where: { id: transactionId },
        data: {
          isReversed: true,
          reversedBy: userId,
          reversedAt: new Date(),
          reverseReason: reason
        }
      })

      // Update credit account balance and totals
      const updateData: any = {
        currentBalance: balanceAfter,
        lastActivity: new Date()
      }

      if (originalTransaction.type === 'CREDIT_ADDED') {
        updateData.totalCreditsAdded = Number(creditAccount.totalCreditsAdded) - reversalAmount
      } else if (originalTransaction.type === 'CREDIT_USED') {
        updateData.totalCreditsUsed = Number(creditAccount.totalCreditsUsed) - reversalAmount
      }

      const updatedAccount = await tx.creditAccount.update({
        where: { id: creditAccount.id },
        data: updateData
      })

      // If original transaction was applied to an invoice, reverse that too
      if (originalTransaction.relatedInvoiceId && originalTransaction.type === 'CREDIT_USED') {
        const invoice = await tx.invoice.findUnique({
          where: { id: originalTransaction.relatedInvoiceId }
        })

        if (invoice) {
          const newInvoiceTotal = Number(invoice.total) + reversalAmount
          await tx.invoice.update({
            where: { id: originalTransaction.relatedInvoiceId },
            data: {
              total: newInvoiceTotal,
              status: 'PENDING', // Reset to pending since credit was removed
              paidAt: null
            }
          })

          // Mark credit application as reversed
          await tx.creditApplication.updateMany({
            where: {
              invoiceId: originalTransaction.relatedInvoiceId,
              creditAccountId: creditAccount.id,
              status: 'APPLIED'
            },
            data: {
              status: 'REVERSED',
              reversedAt: new Date(),
              reversedBy: userId,
              reverseReason: reason
            }
          })
        }
      }

      // Log the reversal
      await tx.dataProcessingLog.create({
        data: {
          clubId,
          userId,
          action: 'UPDATE',
          purpose: 'Credit transaction reversed',
          dataTypes: ['credit_data', 'financial_data'],
          legalBasis: 'LEGITIMATE_INTERESTS',
          source: 'admin_portal',
          metadata: {
            originalTransactionId: transactionId,
            reversalTransactionId: reversalTransaction.id,
            reason,
            amount: reversalAmount
          }
        }
      })

      return { reversalTransaction, updatedAccount }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: `Transaction reversed successfully`
    })

  } catch (error: any) {
    console.error('Reverse credit transaction error:', error)
    
    if (error.message.includes('Cannot reverse')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}