export interface TrialEndingEmailData {
  clubName: string
  adminName: string
  daysRemaining: number
  trialEndDate: string
  subscribeUrl: string
}

export function getTrialEndingEmailTemplate(data: TrialEndingEmailData): { subject: string; html: string; text: string } {
  const subject = `Your Trial Ends in ${data.daysRemaining} ${data.daysRemaining === 1 ? 'Day' : 'Days'} - Subscribe to Continue`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .countdown { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Trial is Ending Soon</h1>
    </div>
    <div class="content">
      <p>Hi ${data.adminName},</p>

      <div class="countdown">${data.daysRemaining}</div>
      <p style="text-align: center; margin-top: -10px; color: #6b7280;">
        ${data.daysRemaining === 1 ? 'day' : 'days'} remaining in your trial
      </p>

      <div class="warning-box">
        <strong>Important:</strong> Your trial period for ${data.clubName} ends on <strong>${data.trialEndDate}</strong>.
        Subscribe now to avoid any interruption to your service.
      </div>

      <p>We hope you've enjoyed exploring Gymnastics Club Manager! To continue using all the features you've come to rely on, please subscribe to one of our plans.</p>

      <p><strong>What happens when your trial ends?</strong></p>
      <ul>
        <li>Access to your club's dashboard will be restricted</li>
        <li>You won't be able to add new students or create invoices</li>
        <li>Your data will be safely stored for 30 days</li>
        <li>You can reactivate anytime by subscribing</li>
      </ul>

      <p style="text-align: center;">
        <a href="${data.subscribeUrl}" class="button">Subscribe Now</a>
      </p>

      <p>Have questions about pricing or features? Our team is here to help. Just reply to this email.</p>

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
Your Trial is Ending Soon

Hi ${data.adminName},

${data.daysRemaining} ${data.daysRemaining === 1 ? 'day' : 'days'} remaining in your trial

IMPORTANT: Your trial period for ${data.clubName} ends on ${data.trialEndDate}. Subscribe now to avoid any interruption to your service.

We hope you've enjoyed exploring Gymnastics Club Manager! To continue using all the features you've come to rely on, please subscribe to one of our plans.

What happens when your trial ends?
- Access to your club's dashboard will be restricted
- You won't be able to add new students or create invoices
- Your data will be safely stored for 30 days
- You can reactivate anytime by subscribing

Subscribe now: ${data.subscribeUrl}

Have questions about pricing or features? Our team is here to help. Just reply to this email.

Best regards,
The Gymnastics Club Manager Team

This email was sent to the admin of ${data.clubName}
© ${new Date().getFullYear()} Gymnastics Club Manager. All rights reserved.
  `

  return { subject, html, text }
}
