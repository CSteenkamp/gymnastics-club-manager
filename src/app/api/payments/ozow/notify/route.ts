import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OzowService, getOzowConfig, OzowNotificationData } from '@/lib/payments/ozow'

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Ozow notification received')
    
    // Parse the form data from Ozow
    const formData = await request.formData()
    const notification: OzowNotificationData = {
      SiteCode: formData.get('SiteCode') as string,
      TransactionId: formData.get('TransactionId') as string,
      TransactionReference: formData.get('TransactionReference') as string,
      Amount: formData.get('Amount') as string,
      Status: formData.get('Status') as string,
      Optional1: formData.get('Optional1') as string,
      Optional2: formData.get('Optional2') as string,
      Optional3: formData.get('Optional3') as string,
      Optional4: formData.get('Optional4') as string,
      Optional5: formData.get('Optional5') as string,
      CurrencyCode: formData.get('CurrencyCode') as string,
      IsTest: formData.get('IsTest') as string,
      StatusMessage: formData.get('StatusMessage') as string,
      HashCheck: formData.get('HashCheck') as string
    }

    console.log('📊 Notification data:', {
      transactionId: notification.TransactionId,
      transactionReference: notification.TransactionReference,
      status: notification.Status,
      amount: notification.Amount,
      invoiceId: notification.Optional1,
      clubId: notification.Optional2,
      paymentId: notification.Optional3
    })

    // Initialize Ozow service for verification
    const ozowConfig = getOzowConfig()
    const ozowService = new OzowService(ozowConfig)

    // Verify the notification
    if (!ozowService.verifyNotification(notification)) {
      console.error('❌ Invalid Ozow notification signature')
      return NextResponse.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 400 })
    }

    console.log('✅ Ozow notification signature verified')

    // Extract data from notification
    const invoiceId = notification.Optional1
    const clubId = notification.Optional2
    const paymentId = notification.Optional3
    const transactionReference = notification.TransactionReference
    const status = notification.Status
    const amountInCents = parseInt(notification.Amount)
    const amount = amountInCents / 100

    if (!invoiceId || !clubId || !paymentId) {
      console.error('❌ Missing required data in notification')
      return NextResponse.json({
        success: false,
        error: 'Missing required data'
      }, { status: 400 })
    }

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clubId,
        invoiceId,
        externalTransactionId: transactionReference
      },
      include: {
        invoice: {
          include: {
            parent: true,
            child: true
          }
        }
      }
    })

    if (!payment) {
      console.error('❌ Payment not found:', {
        paymentId,
        clubId,
        invoiceId,
        transactionReference
      })
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 })
    }

    console.log('💳 Processing payment:', payment.id)

    // Map Ozow status to our payment status
    let paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
    let invoiceStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' = 'PENDING'

    switch (status.toUpperCase()) {
      case 'COMPLETE':
      case 'COMPLETED':
        paymentStatus = 'COMPLETED'
        invoiceStatus = 'PAID'
        break
      case 'CANCELLED':
      case 'CANCELED':
        paymentStatus = 'CANCELLED'
        break
      case 'ERROR':
      case 'FAILED':
        paymentStatus = 'FAILED'
        break
      default:
        paymentStatus = 'PENDING'
    }

    console.log(`📈 Status mapping: ${status} -> ${paymentStatus}`)

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paidAt: paymentStatus === 'COMPLETED' ? new Date() : null,
        metadata: {
          ...payment.metadata,
          ozowStatus: status,
          ozowStatusMessage: notification.StatusMessage,
          ozowTransactionId: notification.TransactionId,
          processedAt: new Date().toISOString()
        }
      }
    })

    console.log('💾 Payment updated:', updatedPayment.id)

    // Update invoice status if payment completed
    if (paymentStatus === 'COMPLETED') {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: invoiceStatus,
          paidAt: new Date()
        }
      })

      console.log('📄 Invoice marked as paid:', payment.invoiceId)

      // Log the payment activity
      await prisma.childActivity.create({
        data: {
          childId: payment.invoice.child.id,
          type: 'PAYMENT',
          description: `Payment received via Ozow - R${amount.toFixed(2)}`,
          oldValue: payment.invoice.status,
          newValue: 'PAID',
          createdBy: payment.parentId
        }
      })

      console.log('📋 Activity logged for child:', payment.invoice.child.id)
    }

    console.log('✅ Ozow notification processed successfully')

    // Return success response to Ozow
    return NextResponse.json({
      success: true,
      message: 'Notification processed successfully'
    })

  } catch (error: any) {
    console.error('❌ Ozow notification processing error:', error)
    
    // Return error response to Ozow
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}