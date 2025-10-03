import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface NotificationTemplate {
  subject: string
  html: string
  text?: string
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password for Gmail
    },
  })
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"Ceres Gymnastics Club" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('📧 Email sent successfully:', result.messageId)
    return true
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return false
  }
}

// Email templates for common notifications
export const emailTemplates = {
  invoiceGenerated: (data: {
    parentName: string
    childName: string
    invoiceNumber: string
    amount: number
    dueDate: string
    clubName: string
  }): NotificationTemplate => ({
    subject: `Invoice ${data.invoiceNumber} - ${data.childName} Monthly Fees`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">${data.clubName}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Monthly Fee Invoice</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${data.parentName},</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            We hope this message finds you well. Please find below the details of your monthly fee invoice for ${data.childName}.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Invoice Number:</td>
                <td style="padding: 8px 0; color: #555;">${data.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Student:</td>
                <td style="padding: 8px 0; color: #555;">${data.childName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Amount Due:</td>
                <td style="padding: 8px 0; color: #e74c3c; font-weight: bold; font-size: 18px;">R${data.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Due Date:</td>
                <td style="padding: 8px 0; color: #555;">${data.dueDate}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c5aa0; margin: 0 0 10px 0;">Payment Methods:</h3>
            <ul style="color: #555; margin: 0; padding-left: 20px;">
              <li>Bank Transfer: Ceres Gymnastics Club - Account: 1234567890</li>
              <li>Online Payment: Visit our parent portal</li>
              <li>Cash: Pay at the front desk during operating hours</li>
            </ul>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin: 20px 0;">
            Please ensure payment is made by the due date to avoid any late fees. If you have any questions or need to discuss payment arrangements, please don't hesitate to contact us.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin: 20px 0;">
            Thank you for your continued support of our gymnastics program!
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            ${data.clubName}<br>
            📞 +27 123 456 789 | 📧 info@ceresgymnastics.co.za<br>
            <small>This is an automated message. Please do not reply to this email.</small>
          </p>
        </div>
      </div>
    `,
    text: `
Dear ${data.parentName},

Invoice ${data.invoiceNumber} for ${data.childName}

Amount Due: R${data.amount.toFixed(2)}
Due Date: ${data.dueDate}

Payment Methods:
- Bank Transfer: Ceres Gymnastics Club - Account: 1234567890
- Online Payment: Visit our parent portal
- Cash: Pay at the front desk

Please ensure payment is made by the due date.

${data.clubName}
+27 123 456 789
info@ceresgymnastics.co.za
    `
  }),

  paymentReceived: (data: {
    parentName: string
    childName: string
    amount: number
    paymentDate: string
    paymentMethod: string
    clubName: string
  }): NotificationTemplate => ({
    subject: `Payment Confirmed - ${data.childName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">${data.clubName}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Payment Confirmation</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${data.parentName},</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Thank you! We have successfully received your payment for ${data.childName}.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #2ecc71; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Student:</td>
                <td style="padding: 8px 0; color: #555;">${data.childName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Amount Paid:</td>
                <td style="padding: 8px 0; color: #2ecc71; font-weight: bold; font-size: 18px;">R${data.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Payment Date:</td>
                <td style="padding: 8px 0; color: #555;">${data.paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">Payment Method:</td>
                <td style="padding: 8px 0; color: #555;">${data.paymentMethod}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin: 20px 0;">
            Your account is now up to date. You can view your payment history and account balance in the parent portal at any time.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            ${data.clubName}<br>
            📞 +27 123 456 789 | 📧 info@ceresgymnastics.co.za
          </p>
        </div>
      </div>
    `,
    text: `
Dear ${data.parentName},

Payment Confirmation for ${data.childName}

Amount Paid: R${data.amount.toFixed(2)}
Payment Date: ${data.paymentDate}
Payment Method: ${data.paymentMethod}

Thank you for your payment!

${data.clubName}
+27 123 456 789
info@ceresgymnastics.co.za
    `
  }),

  welcomeMessage: (data: {
    parentName: string
    childName: string
    clubName: string
  }): NotificationTemplate => ({
    subject: `Welcome to ${data.clubName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to ${data.clubName}!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">We're excited to have ${data.childName} join our gymnastics family</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Dear ${data.parentName},</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Welcome to our gymnastics community! We're thrilled that ${data.childName} has joined us and we look forward to being part of their gymnastics journey.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">What's Next?</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>Check your email for class schedules and important updates</li>
              <li>Log in to your parent portal to view account information</li>
              <li>Ensure your contact details are up to date</li>
              <li>Review our safety guidelines and club policies</li>
            </ul>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin: 20px 0;">
            If you have any questions, please don't hesitate to contact our friendly staff. We're here to support both you and ${data.childName} every step of the way.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            ${data.clubName}<br>
            📞 +27 123 456 789 | 📧 info@ceresgymnastics.co.za
          </p>
        </div>
      </div>
    `,
    text: `
Welcome to ${data.clubName}!

Dear ${data.parentName},

We're thrilled that ${data.childName} has joined our gymnastics community!

What's Next?
- Check your email for class schedules and updates
- Log in to your parent portal
- Ensure your contact details are up to date
- Review our safety guidelines

Contact us with any questions!

${data.clubName}
+27 123 456 789
info@ceresgymnastics.co.za
    `
  })
}