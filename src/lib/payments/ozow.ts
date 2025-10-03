import crypto from 'crypto'

export interface OzowConfig {
  siteCode: string
  privateKey: string
  apiKey: string
  isTest: boolean
  baseUrl: string
}

export interface OzowPaymentRequest {
  amount: number
  transactionReference: string
  bankReference: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone?: string
  successUrl: string
  cancelUrl: string
  errorUrl: string
  notifyUrl: string
  optional1?: string // Invoice ID
  optional2?: string // Club ID
  optional3?: string // Payment ID
  optional4?: string
  optional5?: string
}

export interface OzowPaymentResponse {
  success: boolean
  paymentUrl?: string
  transactionId?: string
  error?: string
}

export interface OzowNotificationData {
  SiteCode: string
  TransactionId: string
  TransactionReference: string
  Amount: string
  Status: string
  Optional1?: string
  Optional2?: string
  Optional3?: string
  Optional4?: string
  Optional5?: string
  CurrencyCode: string
  IsTest: string
  StatusMessage: string
  HashCheck: string
}

export class OzowService {
  private config: OzowConfig

  constructor(config: OzowConfig) {
    this.config = config
  }

  /**
   * Generate payment URL for Ozow
   */
  async generatePaymentUrl(request: OzowPaymentRequest): Promise<OzowPaymentResponse> {
    try {
      // Format amount to cents
      const amountInCents = Math.round(request.amount * 100)
      
      // Create payment data
      const paymentData = {
        SiteCode: this.config.siteCode,
        CountryCode: 'ZA',
        CurrencyCode: 'ZAR',
        Amount: amountInCents.toString(),
        TransactionReference: request.transactionReference,
        BankReference: request.bankReference,
        Customer: request.customerFirstName,
        CustomerFirstName: request.customerFirstName,
        CustomerLastName: request.customerLastName,
        CustomerEmail: request.customerEmail,
        CustomerPhone: request.customerPhone || '',
        SuccessUrl: request.successUrl,
        CancelUrl: request.cancelUrl,
        ErrorUrl: request.errorUrl,
        NotifyUrl: request.notifyUrl,
        IsTest: this.config.isTest ? 'true' : 'false',
        Optional1: request.optional1 || '',
        Optional2: request.optional2 || '',
        Optional3: request.optional3 || '',
        Optional4: request.optional4 || '',
        Optional5: request.optional5 || ''
      }

      // Generate hash check
      const hashCheck = this.generateHashCheck(paymentData)
      paymentData['HashCheck'] = hashCheck

      // Create form data for redirect
      const formData = new URLSearchParams(paymentData)
      const paymentUrl = `${this.config.baseUrl}?${formData.toString()}`

      return {
        success: true,
        paymentUrl,
        transactionId: request.transactionReference
      }

    } catch (error) {
      console.error('Ozow payment URL generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Verify notification from Ozow
   */
  verifyNotification(notification: OzowNotificationData): boolean {
    try {
      const { HashCheck, ...dataToHash } = notification
      const calculatedHash = this.generateHashCheck(dataToHash)
      
      return HashCheck.toLowerCase() === calculatedHash.toLowerCase()
    } catch (error) {
      console.error('Ozow notification verification error:', error)
      return false
    }
  }

  /**
   * Generate hash check for Ozow
   */
  private generateHashCheck(data: Record<string, string>): string {
    // Sort keys alphabetically (case-insensitive)
    const sortedKeys = Object.keys(data).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    // Build string to hash
    let stringToHash = ''
    for (const key of sortedKeys) {
      if (data[key]) { // Only include non-empty values
        stringToHash += data[key].toLowerCase()
      }
    }
    
    // Append private key
    stringToHash += this.config.privateKey.toLowerCase()

    // Generate SHA512 hash
    return crypto
      .createHash('sha512')
      .update(stringToHash, 'utf8')
      .digest('hex')
      .toLowerCase()
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(transactionId: string): Promise<{
    success: boolean
    status?: string
    amount?: number
    error?: string
  }> {
    try {
      // This would typically call Ozow's API to check status
      // For now, return a placeholder implementation
      return {
        success: false,
        error: 'Status check not implemented - use notifications instead'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

export function getOzowConfig(): OzowConfig {
  const siteCode = process.env.OZOW_SITE_CODE
  const privateKey = process.env.OZOW_PRIVATE_KEY
  const apiKey = process.env.OZOW_API_KEY
  const isTest = process.env.OZOW_IS_TEST === 'true'

  if (!siteCode || !privateKey || !apiKey) {
    throw new Error('Missing required Ozow configuration')
  }

  return {
    siteCode,
    privateKey,
    apiKey,
    isTest,
    baseUrl: isTest 
      ? 'https://staging.ozow.com/postpayrequest'
      : 'https://pay.ozow.com/postpayrequest'
  }
}