import { sendEmail, emailTemplates, type EmailOptions } from './email'
import { sendSMS, smsTemplates, type SMSOptions } from './sms'
import { prisma } from '@/lib/prisma'

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  whatsapp?: boolean // Future enhancement
}

export interface NotificationRecipient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  preferences: NotificationPreferences
}

export interface NotificationOptions {
  type: 'invoice_generated' | 'payment_received' | 'payment_overdue' | 'welcome' | 'class_reminder' | 'class_cancelled' | 'general'
  recipients: NotificationRecipient[]
  data: any
  subject?: string
  message?: string
  priority?: 'low' | 'medium' | 'high'
  scheduledFor?: Date
}

export interface NotificationResult {
  success: boolean
  emailsSent: number
  smsSent: number
  errors: string[]
}

// Main notification sending function
export async function sendNotification(options: NotificationOptions): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: true,
    emailsSent: 0,
    smsSent: 0,
    errors: []
  }

  console.log(`📢 Sending ${options.type} notification to ${options.recipients.length} recipients`)

  for (const recipient of options.recipients) {
    try {
      // Send email if enabled
      if (recipient.preferences.email && recipient.email) {
        const emailSent = await sendEmailNotification(recipient, options)
        if (emailSent) {
          result.emailsSent++
        } else {
          result.errors.push(`Failed to send email to ${recipient.email}`)
        }
      }

      // Send SMS if enabled
      if (recipient.preferences.sms && recipient.phone) {
        const smsSent = await sendSMSNotification(recipient, options)
        if (smsSent) {
          result.smsSent++
        } else {
          result.errors.push(`Failed to send SMS to ${recipient.phone}`)
        }
      }

      // Log notification to database
      await logNotification({
        userId: recipient.id,
        type: options.type,
        method: [
          recipient.preferences.email ? 'email' : null,
          recipient.preferences.sms ? 'sms' : null
        ].filter(Boolean).join(','),
        status: 'sent'
      })

    } catch (error) {
      const errorMsg = `Failed to send notification to ${recipient.firstName} ${recipient.lastName}: ${error}`
      result.errors.push(errorMsg)
      console.error('❌', errorMsg)
    }
  }

  result.success = result.errors.length === 0
  console.log(`✅ Notification sent: ${result.emailsSent} emails, ${result.smsSent} SMS`)
  
  return result
}

// Send email notification based on type
async function sendEmailNotification(recipient: NotificationRecipient, options: NotificationOptions): Promise<boolean> {
  let emailOptions: EmailOptions

  switch (options.type) {
    case 'invoice_generated':
      const invoiceTemplate = emailTemplates.invoiceGenerated({
        parentName: `${recipient.firstName} ${recipient.lastName}`,
        childName: options.data.childName,
        invoiceNumber: options.data.invoiceNumber,
        amount: options.data.amount,
        dueDate: options.data.dueDate,
        clubName: options.data.clubName || 'Ceres Gymnastics Club'
      })
      emailOptions = {
        to: recipient.email,
        subject: invoiceTemplate.subject,
        html: invoiceTemplate.html,
        text: invoiceTemplate.text
      }
      break

    case 'payment_received':
      const paymentTemplate = emailTemplates.paymentReceived({
        parentName: `${recipient.firstName} ${recipient.lastName}`,
        childName: options.data.childName,
        amount: options.data.amount,
        paymentDate: options.data.paymentDate,
        paymentMethod: options.data.paymentMethod,
        clubName: options.data.clubName || 'Ceres Gymnastics Club'
      })
      emailOptions = {
        to: recipient.email,
        subject: paymentTemplate.subject,
        html: paymentTemplate.html,
        text: paymentTemplate.text
      }
      break

    case 'welcome':
      const welcomeTemplate = emailTemplates.welcomeMessage({
        parentName: `${recipient.firstName} ${recipient.lastName}`,
        childName: options.data.childName,
        clubName: options.data.clubName || 'Ceres Gymnastics Club'
      })
      emailOptions = {
        to: recipient.email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        text: welcomeTemplate.text
      }
      break

    case 'general':
      emailOptions = {
        to: recipient.email,
        subject: options.subject || 'Notification from Ceres Gymnastics Club',
        html: options.message || '',
        text: options.message?.replace(/<[^>]*>/g, '') // Strip HTML for text version
      }
      break

    default:
      console.warn(`⚠️  Unknown email notification type: ${options.type}`)
      return false
  }

  return await sendEmail(emailOptions)
}

// Send SMS notification based on type
async function sendSMSNotification(recipient: NotificationRecipient, options: NotificationOptions): Promise<boolean> {
  let message: string

  switch (options.type) {
    case 'invoice_generated':
      message = smsTemplates.invoiceGenerated({
        childName: options.data.childName,
        amount: options.data.amount,
        dueDate: options.data.dueDate
      })
      break

    case 'payment_received':
      message = smsTemplates.paymentReceived({
        childName: options.data.childName,
        amount: options.data.amount
      })
      break

    case 'payment_overdue':
      message = smsTemplates.paymentOverdue({
        childName: options.data.childName,
        amount: options.data.amount,
        daysPastDue: options.data.daysPastDue
      })
      break

    case 'class_reminder':
      message = smsTemplates.classReminder({
        childName: options.data.childName,
        className: options.data.className,
        date: options.data.date,
        time: options.data.time
      })
      break

    case 'class_cancelled':
      message = smsTemplates.classCancelled({
        childName: options.data.childName,
        className: options.data.className,
        date: options.data.date,
        reason: options.data.reason
      })
      break

    case 'welcome':
      message = smsTemplates.welcomeMessage({
        parentName: recipient.firstName,
        childName: options.data.childName
      })
      break

    case 'general':
      message = options.message || 'Notification from Ceres Gymnastics Club'
      break

    default:
      console.warn(`⚠️  Unknown SMS notification type: ${options.type}`)
      return false
  }

  const smsOptions: SMSOptions = {
    to: recipient.phone!,
    message
  }

  const result = await sendSMS(smsOptions)
  return result.success
}

// Log notification to database for audit trail
async function logNotification(data: {
  userId: string
  type: string
  method: string
  status: 'sent' | 'failed' | 'pending'
}): Promise<void> {
  try {
    // This would create a notification log entry
    // For now, just console log since we don't have a notifications table yet
    console.log(`📝 Notification logged:`, data)
  } catch (error) {
    console.error('Failed to log notification:', error)
  }
}

// Get user's notification preferences
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailNotifications: true,
        smsNotifications: true
      }
    })

    return {
      email: user?.emailNotifications ?? true,
      sms: user?.smsNotifications ?? false,
      whatsapp: false // Future enhancement
    }
  } catch (error) {
    console.error('Failed to get notification preferences:', error)
    return { email: true, sms: false }
  }
}

// Update user's notification preferences
export async function updateNotificationPreferences(
  userId: string, 
  preferences: NotificationPreferences
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailNotifications: preferences.email,
        smsNotifications: preferences.sms
      }
    })
    return true
  } catch (error) {
    console.error('Failed to update notification preferences:', error)
    return false
  }
}

// Helper function to send notification to all parents of a child
export async function notifyParentsOfChild(
  childId: string,
  notificationType: NotificationOptions['type'],
  data: any
): Promise<NotificationResult> {
  try {
    // Get child and parent information
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        family: {
          include: {
            parents: {
              where: { isActive: true },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                emailNotifications: true,
                smsNotifications: true
              }
            }
          }
        }
      }
    })

    if (!child || !child.family) {
      throw new Error('Child or family not found')
    }

    const recipients: NotificationRecipient[] = child.family.parents.map(parent => ({
      id: parent.id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone || undefined,
      preferences: {
        email: parent.emailNotifications,
        sms: parent.smsNotifications
      }
    }))

    return await sendNotification({
      type: notificationType,
      recipients,
      data: {
        ...data,
        childName: `${child.firstName} ${child.lastName}`
      }
    })
  } catch (error) {
    console.error('Failed to notify parents:', error)
    return {
      success: false,
      emailsSent: 0,
      smsSent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}