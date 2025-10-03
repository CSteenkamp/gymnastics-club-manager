import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/utils/validation'
import { Decimal } from '@prisma/client/runtime/library'

interface InvoiceData {
  clubId: string
  userId: string
  month: number
  year: number
  dueDate: Date
}

interface InvoiceItem {
  childId?: string
  description: string
  amount: number
  quantity: number
  type: 'MONTHLY_FEE' | 'ONCE_OFF' | 'COMPETITION' | 'EQUIPMENT' | 'CLOTHING' | 'REGISTRATION' | 'HOLIDAY_PROGRAM' | 'DISCOUNT' | 'ADJUSTMENT'
}

export async function generateMonthlyInvoice(data: InvoiceData) {
  const { clubId, userId, month, year, dueDate } = data

  // Check if invoice already exists for this month/year
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      clubId,
      userId,
      month,
      year
    }
  })

  if (existingInvoice) {
    throw new Error('Invoice already exists for this period')
  }

  // Get user's children
  const children = await prisma.child.findMany({
    where: {
      clubId,
      parents: {
        some: {
          id: userId
        }
      },
      status: 'ACTIVE'
    }
  })

  if (children.length === 0) {
    throw new Error('No active children found for this parent')
  }

  // Get fee structures
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      clubId,
      isActive: true
    }
  })

  const feeMap = new Map(feeStructures.map(fs => [fs.level, fs.monthlyFee]))

  // Calculate invoice items
  const items: InvoiceItem[] = []
  let subtotal = 0

  for (const child of children) {
    // Calculate effective monthly fee with adjustments
    const effectiveFee = await calculateEffectiveMonthlyFee(child.id, clubId, month, year, child.monthlyFee, feeMap.get(child.level))
    
    if (effectiveFee.amount > 0) {
      items.push({
        childId: child.id,
        description: `${child.firstName} ${child.lastName} - ${child.level} (${getMonthName(month)} ${year})${effectiveFee.adjustmentNote ? ` - ${effectiveFee.adjustmentNote}` : ''}`,
        amount: effectiveFee.amount,
        quantity: 1,
        type: 'MONTHLY_FEE'
      })
      subtotal += effectiveFee.amount
    }
  }

  if (items.length === 0) {
    throw new Error('No fees to invoice for this period')
  }

  // Generate invoice number
  const invoiceNumber = generateInvoiceNumber(clubId, year, month)

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      clubId,
      userId,
      invoiceNumber,
      month,
      year,
      subtotal: new Decimal(subtotal),
      discount: new Decimal(0),
      total: new Decimal(subtotal),
      status: 'PENDING',
      dueDate,
      items: {
        create: items.map(item => ({
          childId: item.childId,
          description: item.description,
          amount: new Decimal(item.amount),
          quantity: item.quantity,
          type: item.type
        }))
      }
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      club: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true
        }
      },
      items: {
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              level: true
            }
          }
        }
      }
    }
  })

  return invoice
}

export async function applyDiscount(invoiceId: string, discountAmount: number, description: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId }
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status !== 'PENDING') {
    throw new Error('Cannot modify paid or cancelled invoice')
  }

  const discount = new Decimal(discountAmount)
  const newTotal = invoice.subtotal.minus(discount)

  if (newTotal.lessThan(0)) {
    throw new Error('Discount cannot be greater than subtotal')
  }

  // Update invoice
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      discount,
      total: newTotal,
      items: {
        create: {
          description,
          amount: new Decimal(-discountAmount),
          quantity: 1,
          type: 'DISCOUNT'
        }
      }
    },
    include: {
      user: true,
      club: true,
      items: {
        include: {
          child: true
        }
      }
    }
  })

  return updatedInvoice
}

export async function addInvoiceItem(invoiceId: string, item: InvoiceItem) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId }
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status !== 'PENDING') {
    throw new Error('Cannot modify paid or cancelled invoice')
  }

  // Add item
  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      childId: item.childId,
      description: item.description,
      amount: new Decimal(item.amount),
      quantity: item.quantity,
      type: item.type
    }
  })

  // Recalculate totals
  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId }
  })

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) * item.quantity), 0)
  const total = subtotal - Number(invoice.discount)

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: new Decimal(subtotal),
      total: new Decimal(total)
    },
    include: {
      user: true,
      club: true,
      items: {
        include: {
          child: true
        }
      }
    }
  })

  return updatedInvoice
}

export async function markInvoiceAsPaid(invoiceId: string, paymentId?: string) {
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'PAID',
      paidAt: new Date()
    }
  })

  return updatedInvoice
}

export async function generateBulkInvoices(clubId: string, month: number, year: number) {
  // Get all active parents with active children
  const parents = await prisma.user.findMany({
    where: {
      clubId,
      role: 'PARENT',
      isActive: true,
      children: {
        some: {
          status: 'ACTIVE'
        }
      }
    }
  })

  const dueDate = new Date(year, month, 15) // 15th of the month
  const results = []

  for (const parent of parents) {
    try {
      const invoice = await generateMonthlyInvoice({
        clubId,
        userId: parent.id,
        month,
        year,
        dueDate
      })
      results.push({ success: true, parentId: parent.id, invoiceId: invoice.id })
    } catch (error: any) {
      results.push({ success: false, parentId: parent.id, error: error.message })
    }
  }

  return results
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || 'Unknown'
}

interface EffectiveFee {
  amount: number
  adjustmentNote?: string
  adjustmentType?: string
}

async function calculateEffectiveMonthlyFee(
  childId: string, 
  clubId: string, 
  month: number, 
  year: number, 
  childMonthlyFee?: Decimal | null,
  levelDefaultFee?: Decimal
): Promise<EffectiveFee> {
  try {
    // Check for active fee adjustments for this specific month/year
    const activeAdjustments = await prisma.feeAdjustment.findMany({
      where: {
        childId,
        clubId,
        isActive: true,
        effectiveYear: { lte: year },
        effectiveMonth: { lte: month },
        OR: [
          // Permanent adjustments (no expiry)
          { adjustmentType: 'PERMANENT' },
          // Temporary adjustments that haven't expired yet
          {
            adjustmentType: 'TEMPORARY',
            OR: [
              { expiryYear: { gt: year } },
              {
                expiryYear: year,
                expiryMonth: { gte: month }
              }
            ]
          }
        ]
      },
      orderBy: [
        { effectiveYear: 'desc' },
        { effectiveMonth: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Priority: Temporary adjustment for current month > Permanent adjustment > Child fee > Level default
    
    // Check for temporary adjustment for this exact month/year
    const temporaryAdjustment = activeAdjustments.find(adj => 
      adj.adjustmentType === 'TEMPORARY' && 
      adj.effectiveYear <= year &&
      adj.effectiveMonth <= month &&
      (adj.expiryYear! > year || (adj.expiryYear === year && adj.expiryMonth! >= month))
    )

    if (temporaryAdjustment) {
      return {
        amount: Number(temporaryAdjustment.adjustedFee),
        adjustmentNote: `Temporary adjustment: ${temporaryAdjustment.reason}`,
        adjustmentType: 'TEMPORARY'
      }
    }

    // Check for most recent permanent adjustment
    const permanentAdjustment = activeAdjustments.find(adj => adj.adjustmentType === 'PERMANENT')
    
    if (permanentAdjustment) {
      return {
        amount: Number(permanentAdjustment.adjustedFee),
        adjustmentNote: `Adjusted fee: ${permanentAdjustment.reason}`,
        adjustmentType: 'PERMANENT'
      }
    }

    // Use child's custom fee or level default
    const baseFee = childMonthlyFee || levelDefaultFee || new Decimal(0)
    
    return {
      amount: Number(baseFee)
    }
  } catch (error) {
    console.error('Error calculating effective monthly fee:', error)
    // Fallback to base fee if fee adjustment query fails
    const baseFee = childMonthlyFee || levelDefaultFee || new Decimal(0)
    return {
      amount: Number(baseFee)
    }
  }
}

// Helper function to get current effective monthly fee for a child
export async function getCurrentEffectiveMonthlyFee(childId: string, clubId: string): Promise<EffectiveFee> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-based
  const currentYear = now.getFullYear()

  try {
    // Get child's base fee and level default
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        club: {
          include: {
            feeStructures: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!child) {
      throw new Error('Child not found')
    }

    const levelDefault = child.club.feeStructures.find(fs => fs.level === child.level)?.monthlyFee

    return calculateEffectiveMonthlyFee(
      childId, 
      clubId, 
      currentMonth, 
      currentYear, 
      child.monthlyFee, 
      levelDefault
    )
  } catch (error) {
    console.error('Error getting current effective monthly fee:', error)
    // Fallback
    return { amount: 0 }
  }
}