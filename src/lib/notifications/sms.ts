// SMS notification service for South African providers
// Supports Clickatell and BulkSMS - popular SA SMS gateways

export interface SMSOptions {
  to: string | string[] // Phone numbers in +27 format
  message: string
  from?: string // Sender ID (optional)
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
  cost?: number
}

// Format phone number for South African providers
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If it starts with 0, replace with 27
  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1)
  }
  
  // If it doesn't start with 27, add it
  if (!cleaned.startsWith('27')) {
    cleaned = '27' + cleaned
  }
  
  return '+' + cleaned
}

// Clickatell SMS provider
async function sendClickatellSMS(options: SMSOptions): Promise<SMSResponse> {
  try {
    const apiKey = process.env.SMS_API_KEY
    if (!apiKey) {
      throw new Error('Clickatell API key not configured')
    }

    const numbers = Array.isArray(options.to) ? options.to : [options.to]
    const formattedNumbers = numbers.map(formatPhoneNumber)

    const response = await fetch('https://platform.clickatell.com/messages/http/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: formattedNumbers.map(number => ({
          to: [number],
          content: options.message,
          from: options.from || 'CeresGym'
        }))
      })
    })

    const result = await response.json()
    
    if (response.ok && result.messages && result.messages[0]) {
      return {
        success: true,
        messageId: result.messages[0].apiMessageId,
        cost: result.messages[0].cost
      }
    } else {
      return {
        success: false,
        error: result.error?.description || 'SMS sending failed'
      }
    }
  } catch (error) {
    console.error('❌ Clickatell SMS error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// BulkSMS provider
async function sendBulkSMS(options: SMSOptions): Promise<SMSResponse> {
  try {
    const username = process.env.SMS_USERNAME
    const password = process.env.SMS_API_KEY // BulkSMS uses password as API key
    
    if (!username || !password) {
      throw new Error('BulkSMS credentials not configured')
    }

    const numbers = Array.isArray(options.to) ? options.to : [options.to]
    const formattedNumbers = numbers.map(formatPhoneNumber)

    const response = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: formattedNumbers.map(number => ({
          to: number,
          body: options.message,
          from: options.from || 'CeresGym'
        }))
      })
    })

    const result = await response.json()
    
    if (response.ok && result[0]) {
      return {
        success: true,
        messageId: result[0].id,
        cost: result[0].cost?.amount
      }
    } else {
      return {
        success: false,
        error: result.detail || 'SMS sending failed'
      }
    }
  } catch (error) {
    console.error('❌ BulkSMS error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main SMS sending function
export async function sendSMS(options: SMSOptions): Promise<SMSResponse> {
  const provider = process.env.SMS_PROVIDER?.toLowerCase() || 'clickatell'
  
  console.log(`📱 Sending SMS via ${provider} to:`, options.to)
  
  switch (provider) {
    case 'clickatell':
      return await sendClickatellSMS(options)
    case 'bulksms':
      return await sendBulkSMS(options)
    default:
      console.error('❌ Unknown SMS provider:', provider)
      return {
        success: false,
        error: `Unknown SMS provider: ${provider}`
      }
  }
}

// SMS templates for common notifications
export const smsTemplates = {
  invoiceGenerated: (data: {
    childName: string
    amount: number
    dueDate: string
  }): string => 
    `Ceres Gymnastics: Invoice for ${data.childName} - R${data.amount.toFixed(2)} due ${data.dueDate}. Pay online or at reception. Thank you!`,

  paymentReceived: (data: {
    childName: string
    amount: number
  }): string => 
    `Ceres Gymnastics: Payment of R${data.amount.toFixed(2)} received for ${data.childName}. Thank you!`,

  paymentOverdue: (data: {
    childName: string
    amount: number
    daysPastDue: number
  }): string => 
    `Ceres Gymnastics: Payment for ${data.childName} (R${data.amount.toFixed(2)}) is ${data.daysPastDue} days overdue. Please contact us to arrange payment.`,

  classReminder: (data: {
    childName: string
    className: string
    date: string
    time: string
  }): string => 
    `Ceres Gymnastics: Reminder - ${data.childName} has ${data.className} class ${data.date} at ${data.time}. See you there!`,

  classCancelled: (data: {
    childName: string
    className: string
    date: string
    reason?: string
  }): string => 
    `Ceres Gymnastics: ${data.className} class for ${data.childName} on ${data.date} has been cancelled${data.reason ? ` due to ${data.reason}` : ''}. We'll notify you of the make-up class.`,

  welcomeMessage: (data: {
    parentName: string
    childName: string
  }): string => 
    `Welcome to Ceres Gymnastics ${data.parentName}! We're excited to have ${data.childName} join our gymnastics family. Check your email for important information.`
}

// Test SMS function for development
export async function testSMS(): Promise<void> {
  const testOptions: SMSOptions = {
    to: '+27123456789', // Replace with your test number
    message: 'Test message from Ceres Gymnastics Club management system.'
  }
  
  const result = await sendSMS(testOptions)
  console.log('SMS Test Result:', result)
}