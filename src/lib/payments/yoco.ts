import crypto from 'crypto'

export interface YocoConfig {
  secretKey: string
  publicKey: string
  sandbox: boolean
}

export interface YocoPaymentRequest {
  amount: number // Amount in cents
  currency: string // 'ZAR'
  description: string
  metadata: {
    invoiceId: string
    clubId: string
    userId: string
    childName?: string
    invoiceNumber: string
  }
  successUrl: string
  cancelUrl: string
  webhookUrl: string
  customerEmail: string
  customerPhone?: string
}

export interface YocoCheckoutResponse {
  success: boolean
  checkoutUrl?: string
  checkoutId?: string
  error?: string
}

export interface YocoWebhookPayload {
  id: string
  type: string
  created: string
  object: {
    id: string
    amount: number
    currency: string
    description: string
    status: string
    metadata: Record<string, any>
    customer?: {
      email: string
      phone?: string
    }
    payment_method?: {
      type: string
      card?: {
        last4: string
        brand: string
      }
    }
  }
}

export class YocoService {
  private config: YocoConfig
  private baseUrl: string

  constructor(config: YocoConfig) {
    this.config = config
    this.baseUrl = config.sandbox 
      ? 'https://payments.yoco.com/api/checkouts'
      : 'https://payments.yoco.com/api/checkouts'
  }

  /**
   * Create a Yoco checkout session
   */
  async createCheckout(request: YocoPaymentRequest): Promise<YocoCheckoutResponse> {
    try {
      // Validate request
      if (!request.amount || request.amount <= 0) {
        return { success: false, error: 'Invalid amount' }
      }

      if (!request.customerEmail) {
        return { success: false, error: 'Customer email is required' }
      }

      // Prepare checkout data
      const checkoutData = {
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency || 'ZAR',
        description: request.description,
        metadata: request.metadata,
        successUrl: request.successUrl,
        cancelUrl: request.cancelUrl,
        webhookUrl: request.webhookUrl,
        customer: {
          email: request.customerEmail,
          ...(request.customerPhone && { phone: request.customerPhone })
        }
      }

      console.log('🔵 Creating Yoco checkout:', checkoutData)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      })

      const responseData = await response.json()

      if (response.ok) {
        return {
          success: true,
          checkoutUrl: responseData.redirectUrl,
          checkoutId: responseData.id
        }
      } else {
        console.error('❌ Yoco checkout creation failed:', responseData)
        return {
          success: false,
          error: responseData.message || 'Failed to create checkout'
        }
      }

    } catch (error) {
      console.error('❌ Yoco service error:', error)
      return {
        success: false,
        error: 'Internal payment service error'
      }
    }
  }

  /**
   * Verify Yoco webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('❌ Yoco signature verification error:', error)
      return false
    }
  }

  /**
   * Process Yoco webhook payload
   */
  processWebhook(payload: YocoWebhookPayload): {
    valid: boolean
    data?: {
      paymentId: string
      status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED'
      amount: number
      currency: string
      description: string
      metadata: Record<string, any>
      paymentMethod?: {
        type: string
        card?: {
          last4: string
          brand: string
        }
      }
      customer?: {
        email: string
        phone?: string
      }
    }
  } {
    try {
      if (!payload || !payload.object) {
        return { valid: false }
      }

      const { object } = payload

      // Map Yoco status to our internal status
      const status = this.mapYocoStatus(object.status)

      return {
        valid: true,
        data: {
          paymentId: object.id,
          status,
          amount: object.amount / 100, // Convert from cents
          currency: object.currency,
          description: object.description,
          metadata: object.metadata || {},
          paymentMethod: object.payment_method,
          customer: object.customer
        }
      }

    } catch (error) {
      console.error('❌ Yoco webhook processing error:', error)
      return { valid: false }
    }
  }

  /**
   * Map Yoco payment status to internal status
   */
  private mapYocoStatus(yocoStatus: string): 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED' {
    switch (yocoStatus?.toLowerCase()) {
      case 'succeeded':
      case 'completed':
        return 'COMPLETED'
      case 'pending':
      case 'processing':
        return 'PENDING'
      case 'failed':
      case 'error':
        return 'FAILED'
      case 'cancelled':
      case 'canceled':
        return 'CANCELLED'
      default:
        return 'PENDING'
    }
  }

  /**
   * Get checkout status
   */
  async getCheckoutStatus(checkoutId: string): Promise<{
    success: boolean
    status?: string
    payment?: any
    error?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/${checkoutId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          status: data.status,
          payment: data
        }
      } else {
        return {
          success: false,
          error: data.message || 'Failed to get checkout status'
        }
      }

    } catch (error) {
      console.error('❌ Yoco status check error:', error)
      return {
        success: false,
        error: 'Failed to check payment status'
      }
    }
  }

  /**
   * Generate a unique transaction reference
   */
  generateTransactionReference(): string {
    return `YOCO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Get Yoco configuration from environment variables
 */
export function getYocoConfig(): YocoConfig {
  const secretKey = process.env.YOCO_SECRET_KEY
  const publicKey = process.env.YOCO_PUBLIC_KEY || ''
  const sandbox = process.env.YOCO_SANDBOX === 'true'

  if (!secretKey) {
    throw new Error('Yoco configuration missing. Please set YOCO_SECRET_KEY environment variable.')
  }

  return {
    secretKey,
    publicKey,
    sandbox
  }
}

/**
 * Validate Yoco webhook event
 */
export function validateYocoWebhook(
  payload: string, 
  signature: string, 
  webhookSecret: string
): boolean {
  try {
    const yocoService = new YocoService(getYocoConfig())
    return yocoService.verifyWebhookSignature(payload, signature, webhookSecret)
  } catch (error) {
    console.error('❌ Yoco webhook validation error:', error)
    return false
  }
}