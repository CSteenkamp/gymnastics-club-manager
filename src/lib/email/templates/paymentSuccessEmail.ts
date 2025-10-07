export interface PaymentSuccessEmailData {
  clubName: string
  adminName: string
  amount: string
  currency: string
  paymentDate: string
  nextBillingDate: string
  invoiceUrl?: string
  invoiceNumber?: string
}

export function getPaymentSuccessEmailTemplate(data: PaymentSuccessEmailData): { subject: string; html: string; text: string } {
  const subject = `Payment Received - ${data.amount} ${data.currency} for ${data.clubName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
    .invoice-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Payment Successful</h1>
    </div>
    <div class="content">
      <p>Hi ${data.adminName},</p>

      <div class="success-box">
        <strong>Thank you!</strong> Your payment for ${data.clubName} has been successfully processed.
      </div>

      <div class="amount">${data.amount} ${data.currency}</div>

      <div class="invoice-box">
        <p><strong>Payment Summary:</strong></p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Club:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.clubName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.amount} ${data.currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Payment Date:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.paymentDate}</td>
          </tr>
          ${data.invoiceNumber ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.invoiceNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px;">Next Billing Date:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500; border-top: 1px solid #e5e7eb; padding-top: 12px;">${data.nextBillingDate}</td>
          </tr>
        </table>
      </div>

      ${data.invoiceUrl ? `
      <p style="text-align: center;">
        <a href="${data.invoiceUrl}" class="button">Download Invoice</a>
      </p>
      ` : ''}

      <p>Your subscription is now active and you have full access to all features. If you have any questions about your billing, please don't hesitate to reach out.</p>

      <p>Best regards,<br>
      The Gymnastics Club Manager Team</p>
    </div>
    <div class="footer">
      <p>This email was sent to the admin of ${data.clubName}</p>
      <p>© ${new Date().getFullYear()} Gymnastics Club Manager. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
✓ Payment Successful

Hi ${data.adminName},

Thank you! Your payment for ${data.clubName} has been successfully processed.

Amount: ${data.amount} ${data.currency}

Payment Summary:
- Club: ${data.clubName}
- Amount: ${data.amount} ${data.currency}
- Payment Date: ${data.paymentDate}
${data.invoiceNumber ? `- Invoice Number: ${data.invoiceNumber}` : ''}
- Next Billing Date: ${data.nextBillingDate}

${data.invoiceUrl ? `Download Invoice: ${data.invoiceUrl}` : ''}

Your subscription is now active and you have full access to all features. If you have any questions about your billing, please don't hesitate to reach out.

Best regards,
The Gymnastics Club Manager Team

This email was sent to the admin of ${data.clubName}
© ${new Date().getFullYear()} Gymnastics Club Manager. All rights reserved.
  `

  return { subject, html, text }
}
