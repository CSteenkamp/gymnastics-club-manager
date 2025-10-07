import { NextRequest, NextResponse } from 'next/server'
import { generateBulkInvoices } from '@/lib/invoice'
import { ApiResponse } from '@/types'

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

    // Only admins can generate bulk invoices
    if (userRole !== 'ADMIN' && userRole !== 'FINANCE_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Forbidden'
      }, { status: 403 })
    }

    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: month, year'
      }, { status: 400 })
    }

    const results = await generateBulkInvoices(clubId, parseInt(month), parseInt(year))

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed
        }
      },
      message: `Bulk invoice generation completed. ${successful} successful, ${failed} failed.`
    })

  } catch (error: any) {
    console.error('Bulk invoice generation error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
