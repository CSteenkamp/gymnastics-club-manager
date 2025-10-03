import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PayFastService, getPayFastConfig } from '@/lib/payments/payfast'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 PayFast ITN received')
    
    // Get the raw body as text
    const body = await request.text()
    console.log('📧 ITN Body:', body)

    // Parse the form data
    const formData = new URLSearchParams(body)
    const itnData: Record<string, string> = {}
    
    for (const [key, value] of formData.entries()) {
      itnData[key] = value
    }

    console.log('📧 ITN Data:', itnData)

    // Initialize PayFast service and verify ITN
    const payfastConfig = getPayFastConfig()
    const payfastService = new PayFastService(payfastConfig)
    
    const verification = await payfastService.verifyITN(itnData)

    if (!verification.valid) {
      console.error('❌ PayFast ITN verification failed')
      return NextResponse.json({ error: 'Invalid ITN' }, { status: 400 })
    }

    console.log('✅ PayFast ITN verified successfully')
    console.log('📊 Payment data:', verification.data)

    const paymentData = verification.data!

    // Extract custom fields
    const invoiceId = paymentData.customStr1
    const clubId = paymentData.customStr2
    const paymentId = paymentData.customStr3

    if (!invoiceId || !clubId || !paymentId) {
      console.error('❌ Missing required custom fields in ITN')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Parse payment status
    const statusResult = PayFastService.parsePaymentStatus(paymentData.paymentStatus)
    
    console.log(`🔄 Updating payment ${paymentId} status to ${statusResult.status}`)

    // Update payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: statusResult.status,
        payfastTransactionId: paymentData.payfastTransactionId,
        externalTransactionId: paymentData.payfastTransactionId,
        processedAt: new Date(),
        metadata: {
          ...payment.metadata,
          payfastStatus: paymentData.paymentStatus,
          payfastTransactionId: paymentData.payfastTransactionId,
          merchantTransactionId: paymentData.merchantTransactionId,
          statusDescription: statusResult.description,
          itnProcessedAt: new Date().toISOString()
        }
      }
    })

    // If payment is completed, update invoice status
    if (statusResult.status === 'COMPLETED') {
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
          description: `Payment of ${paymentData.amount} completed via PayFast`,
          amount: paymentData.amount,
          metadata: {
            payfastTransactionId: paymentData.payfastTransactionId,
            invoiceNumber: payment.invoice.number,
            childName: `${payment.invoice.child.firstName} ${payment.invoice.child.lastName}`
          }
        }
      })

      console.log('✅ Invoice marked as paid and activity logged')
    } else if (statusResult.status === 'FAILED') {
      console.log(`❌ Payment failed - logging activity for payment ${paymentId}`)
      
      // Create payment activity log for failed payment
      await prisma.paymentActivity.create({
        data: {
          paymentId,
          type: 'PAYMENT_FAILED',
          description: `Payment failed: ${statusResult.description}`,
          metadata: {
            payfastTransactionId: paymentData.payfastTransactionId,
            payfastStatus: paymentData.paymentStatus,
            failureReason: statusResult.description
          }
        }
      })
    }

    console.log('✅ PayFast ITN processed successfully')
    
    // PayFast expects "OK" response for successful processing
    return new NextResponse('OK', { status: 200 })

  } catch (error: any) {
    console.error('❌ PayFast ITN processing error:', error)
    
    // Return 500 so PayFast will retry the ITN
    return NextResponse.json({ 
      error: 'ITN processing failed',
      details: error.message 
    }, { status: 500 })
  }
}

// PayFast ITNs are always POST requests
export async function GET() {
  return NextResponse.json({ 
    error: 'ITN endpoint only accepts POST requests' 
  }, { status: 405 })
}