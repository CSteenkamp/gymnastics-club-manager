import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { YocoService, getYocoConfig } from '@/lib/payments/yoco'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Yoco webhook received')
    
    // Get the raw body and signature
    const body = await request.text()
    const signature = request.headers.get('x-yoco-signature') || ''
    
    console.log('📧 Webhook Body:', body)
    console.log('📧 Webhook Signature:', signature)

    // Verify webhook signature
    const webhookSecret = process.env.YOCO_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ Yoco webhook secret not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const yocoConfig = getYocoConfig()
    const yocoService = new YocoService(yocoConfig)

    const isValidSignature = yocoService.verifyWebhookSignature(body, signature, webhookSecret)
    
    if (!isValidSignature) {
      console.error('❌ Yoco webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('✅ Yoco webhook signature verified')

    // Parse webhook payload
    const webhookData = JSON.parse(body)
    console.log('📊 Webhook data:', webhookData)

    // Process the webhook
    const processed = yocoService.processWebhook(webhookData)

    if (!processed.valid) {
      console.error('❌ Yoco webhook processing failed')
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
    }

    const paymentData = processed.data!

    // Extract metadata
    const metadata = paymentData.metadata
    const invoiceId = metadata.invoiceId
    const clubId = metadata.clubId
    const paymentId = metadata.userId // This contains our payment ID

    if (!invoiceId || !clubId || !paymentId) {
      console.error('❌ Missing required metadata in Yoco webhook')
      return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
    }

    // Get the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        clubId,
        invoiceId
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
      console.error('❌ Payment record not found:', paymentId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    console.log(`🔄 Updating payment ${paymentId} status to ${paymentData.status}`)

    // Update payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: paymentData.status,
        externalTransactionId: paymentData.paymentId,
        processedAt: new Date(),
        metadata: {
          ...payment.metadata,
          yocoPaymentId: paymentData.paymentId,
          yocoStatus: webhookData.object.status,
          paymentMethod: paymentData.paymentMethod,
          webhookProcessedAt: new Date().toISOString()
        }
      }
    })

    // If payment is completed, update invoice status
    if (paymentData.status === 'COMPLETED') {
      console.log(`💰 Payment completed - updating invoice ${invoiceId}`)
      
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidAmount: paymentData.amount
        }
      })

      // Create payment activity log
      await prisma.paymentActivity.create({
        data: {
          paymentId,
          type: 'PAYMENT_COMPLETED',
          description: `Payment of ${paymentData.amount} completed via Yoco`,
          amount: paymentData.amount,
          metadata: {
            yocoPaymentId: paymentData.paymentId,
            invoiceNumber: payment.invoice.number,
            childName: `${payment.invoice.child.firstName} ${payment.invoice.child.lastName}`,
            paymentMethod: paymentData.paymentMethod
          }
        }
      })

      console.log('✅ Invoice marked as paid and activity logged')
    } else if (paymentData.status === 'FAILED') {
      console.log(`❌ Payment failed - logging activity for payment ${paymentId}`)
      
      // Create payment activity log for failed payment
      await prisma.paymentActivity.create({
        data: {
          paymentId,
          type: 'PAYMENT_FAILED',
          description: `Yoco payment failed`,
          metadata: {
            yocoPaymentId: paymentData.paymentId,
            yocoStatus: webhookData.object.status,
            failureReason: 'Payment failed via Yoco'
          }
        }
      })
    } else if (paymentData.status === 'CANCELLED') {
      console.log(`⚠️ Payment cancelled - logging activity for payment ${paymentId}`)
      
      // Create payment activity log for cancelled payment
      await prisma.paymentActivity.create({
        data: {
          paymentId,
          type: 'PAYMENT_CANCELLED',
          description: `Yoco payment cancelled by user`,
          metadata: {
            yocoPaymentId: paymentData.paymentId,
            yocoStatus: webhookData.object.status
          }
        }
      })
    }

    console.log('✅ Yoco webhook processed successfully')
    
    // Return success response
    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook processed successfully' 
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Yoco webhook processing error:', error)
    
    // Return 500 so Yoco will retry the webhook
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 })
  }
}

// Yoco webhooks are always POST requests
export async function GET() {
  return NextResponse.json({ 
    error: 'Webhook endpoint only accepts POST requests' 
  }, { status: 405 })
}