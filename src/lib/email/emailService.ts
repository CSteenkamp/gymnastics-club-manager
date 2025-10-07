import nodemailer from 'nodemailer'
import { getWelcomeEmailTemplate, WelcomeEmailData } from './templates/welcomeEmail'
import { getTrialEndingEmailTemplate, TrialEndingEmailData } from './templates/trialEndingEmail'
import { getPaymentFailedEmailTemplate, PaymentFailedEmailData } from './templates/paymentFailedEmail'
import { getPaymentSuccessEmailTemplate, PaymentSuccessEmailData } from './templates/paymentSuccessEmail'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Gymnastics Club Manager" <noreply@gymclubmanager.com>',
      to,
      subject,
      html,
      text,
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(to: string, data: WelcomeEmailData) {
  const { subject, html, text } = getWelcomeEmailTemplate(data)
  return sendEmail({ to, subject, html, text })
}

export async function sendTrialEndingEmail(to: string, data: TrialEndingEmailData) {
  const { subject, html, text } = getTrialEndingEmailTemplate(data)
  return sendEmail({ to, subject, html, text })
}

export async function sendPaymentFailedEmail(to: string, data: PaymentFailedEmailData) {
  const { subject, html, text } = getPaymentFailedEmailTemplate(data)
  return sendEmail({ to, subject, html, text })
}

export async function sendPaymentSuccessEmail(to: string, data: PaymentSuccessEmailData) {
  const { subject, html, text } = getPaymentSuccessEmailTemplate(data)
  return sendEmail({ to, subject, html, text })
}

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log('Email server is ready to send messages')
    return true
  } catch (error) {
    console.error('Email server configuration error:', error)
    return false
  }
}
