export interface PaymentFailedEmailData {
  clubName: string
  adminName: string
  amount: string
  currency: string
  attemptCount: number
  nextAttemptDate?: string
  updatePaymentUrl: string
}

export function getPaymentFailedEmailTemplate(data: PaymentFailedEmailData): { subject: string; html: string; text: string } {
  const subject = `Payment Failed - Action Required for ${data.clubName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .error-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .amount { font-size: 32px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Payment Failed</h1>
    </div>
    <div class="content">
      <p>Hi ${data.adminName},</p>

      <div class="error-box">
        <strong>Action Required:</strong> We were unable to process your subscription payment for ${data.clubName}.
      </div>

      <div class="amount">${data.amount} ${data.currency}</div>

      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Club: ${data.clubName}</li>
        <li>Amount: ${data.amount} ${data.currency}</li>
        <li>Attempt: ${data.attemptCount}</li>
        ${data.nextAttemptDate ? `<li>Next retry: ${data.nextAttemptDate}</li>` : ''}
      </ul>

      <p><strong>What you need to do:</strong></p>
      <ol>
        <li>Check that your payment method has sufficient funds</li>
        <li>Verify your card hasn't expired</li>
        <li>Update your payment method if needed</li>
      </ol>

      <p style="text-align: center;">
        <a href="${data.updatePaymentUrl}" class="button">Update Payment Method</a>
      </p>

      <p><strong>What happens if payment isn't resolved?</strong></p>
      <ul>
        <li>We'll retry the payment automatically</li>
        <li>If all retries fail, your subscription may be suspended</li>
        <li>You'll have a 7-day grace period to resolve the issue</li>
      </ul>

      <p>If you're experiencing issues or need help, please contact our support team immediately.</p>

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
⚠️ Payment Failed - Action Required

Hi ${data.adminName},

ACTION REQUIRED: We were unable to process your subscription payment for ${data.clubName}.

Amount: ${data.amount} ${data.currency}

Payment Details:
- Club: ${data.clubName}
- Amount: ${data.amount} ${data.currency}
- Attempt: ${data.attemptCount}
${data.nextAttemptDate ? `- Next retry: ${data.nextAttemptDate}` : ''}

What you need to do:
1. Check that your payment method has sufficient funds
2. Verify your card hasn't expired
3. Update your payment method if needed

Update payment method: ${data.updatePaymentUrl}

What happens if payment isn't resolved?
- We'll retry the payment automatically
- If all retries fail, your subscription may be suspended
- You'll have a 7-day grace period to resolve the issue

If you're experiencing issues or need help, please contact our support team immediately.

Best regards,
The Gymnastics Club Manager Team

This email was sent to the admin of ${data.clubName}
© ${new Date().getFullYear()} Gymnastics Club Manager. All rights reserved.
  `

  return { subject, html, text }
}
