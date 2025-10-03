import crypto from 'crypto'

export interface PayFastConfig {
  merchantId: string
  merchantKey: string
  passPhrase?: string
  sandbox: boolean
}

export interface PaymentRequest {
  amount: number
  itemName: string
  itemDescription?: string
  email: string
  firstName: string
  lastName: string
  cellNumber?: string
  customStr1?: string // Invoice ID
  customStr2?: string // Club ID
  customStr3?: string // User ID
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
}

export interface PayFastResponse {
  success: boolean
  paymentUrl?: string
  error?: string
  transactionId?: string
}

export class PayFastService {
  private config: PayFastConfig

  constructor(config: PayFastConfig) {
    this.config = config
  }

  /**
   * Generate payment URL for PayFast
   */
  async generatePaymentUrl(request: PaymentRequest): Promise<PayFastResponse> {
    try {
      // Validate request
      if (!request.amount || request.amount <= 0) {
        return { success: false, error: 'Invalid amount' }
      }

      if (!request.email || !request.firstName || !request.lastName) {
        return { success: false, error: 'Missing required customer details' }
      }

      // Build payment data
      const paymentData = {
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        notify_url: request.notifyUrl,
        name_first: request.firstName,
        name_last: request.lastName,
        email_address: request.email,
        cell_number: request.cellNumber || '',
        amount: request.amount.toFixed(2),
        item_name: request.itemName,
        item_description: request.itemDescription || request.itemName,
        custom_str1: request.customStr1 || '',
        custom_str2: request.customStr2 || '',
        custom_str3: request.customStr3 || '',
        custom_str4: '',
        custom_str5: '',
        custom_int1: '',
        custom_int2: '',
        custom_int3: '',
        custom_int4: '',
        custom_int5: ''
      }

      // Generate signature
      const signature = this.generateSignature(paymentData)
      
      // Add signature to payment data
      const finalPaymentData = {
        ...paymentData,
        signature
      }

      // Build URL
      const baseUrl = this.config.sandbox 
        ? 'https://sandbox.payfast.co.za/eng/process'
        : 'https://www.payfast.co.za/eng/process'

      const queryString = new URLSearchParams(finalPaymentData).toString()
      const paymentUrl = `${baseUrl}?${queryString}`

      return {
        success: true,
        paymentUrl,
        transactionId: this.generateTransactionId()
      }

    } catch (error) {
      console.error('PayFast payment URL generation error:', error)
      return {
        success: false,
        error: 'Failed to generate payment URL'
      }
    }
  }

  /**
   * Verify PayFast ITN (Instant Transaction Notification)
   */
  async verifyITN(payload: any): Promise<{ valid: boolean; data?: any }> {
    try {
      // Remove signature from payload for verification
      const { signature, ...dataToVerify } = payload

      // Generate signature for verification
      const calculatedSignature = this.generateSignature(dataToVerify)

      // Verify signature
      if (signature !== calculatedSignature) {
        console.error('PayFast ITN signature verification failed')
        return { valid: false }
      }

      // Additional verification: Check merchant details
      if (dataToVerify.merchant_id !== this.config.merchantId) {
        console.error('PayFast ITN merchant ID mismatch')
        return { valid: false }
      }

      // Verify with PayFast server (recommended for production)
      const serverVerification = await this.verifyWithPayFastServer(payload)
      if (!serverVerification) {
        console.error('PayFast server verification failed')
        return { valid: false }
      }

      return {
        valid: true,
        data: {
          paymentStatus: payload.payment_status,
          amount: parseFloat(payload.amount_gross),
          merchantTransactionId: payload.m_payment_id,
          payfastTransactionId: payload.pf_payment_id,
          customStr1: payload.custom_str1, // Invoice ID
          customStr2: payload.custom_str2, // Club ID
          customStr3: payload.custom_str3, // User ID
          email: payload.email_address,
          firstName: payload.name_first,
          lastName: payload.name_last
        }
      }

    } catch (error) {
      console.error('PayFast ITN verification error:', error)
      return { valid: false }
    }
  }

  /**
   * Generate MD5 signature for PayFast
   */
  private generateSignature(data: Record<string, any>): string {
    // Filter out empty values and signature
    const filteredData = Object.entries(data)
      .filter(([key, value]) => key !== 'signature' && value !== '' && value != null)
      .sort(([a], [b]) => a.localeCompare(b))

    // Build parameter string
    let paramString = filteredData
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')

    // Add passphrase if configured
    if (this.config.passPhrase) {
      paramString += `&passphrase=${encodeURIComponent(this.config.passPhrase)}`
    }

    // Generate MD5 hash
    return crypto.createHash('md5').update(paramString).digest('hex')
  }

  /**
   * Verify ITN with PayFast server
   */
  private async verifyWithPayFastServer(payload: any): Promise<boolean> {
    try {
      const baseUrl = this.config.sandbox 
        ? 'https://sandbox.payfast.co.za/eng/query/validate'
        : 'https://www.payfast.co.za/eng/query/validate'

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload).toString()
      })

      const result = await response.text()
      return result.trim() === 'VALID'

    } catch (error) {
      console.error('PayFast server verification error:', error)
      return false
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Parse payment status from PayFast
   */
  static parsePaymentStatus(status: string): {
    status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED'
    description: string
  } {
    switch (status?.toLowerCase()) {
      case 'complete':
        return { status: 'COMPLETED', description: 'Payment completed successfully' }
      case 'failed':
        return { status: 'FAILED', description: 'Payment failed' }
      case 'cancelled':
        return { status: 'CANCELLED', description: 'Payment cancelled by user' }
      default:
        return { status: 'PENDING', description: 'Payment pending' }
    }
  }
}

/**
 * Get PayFast configuration from environment variables
 */
export function getPayFastConfig(): PayFastConfig {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passPhrase = process.env.PAYFAST_PASSPHRASE
  const sandbox = process.env.PAYFAST_SANDBOX === 'true'

  if (!merchantId || !merchantKey) {
    throw new Error('PayFast configuration missing. Please set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables.')
  }

  return {
    merchantId,
    merchantKey,
    passPhrase,
    sandbox
  }
}