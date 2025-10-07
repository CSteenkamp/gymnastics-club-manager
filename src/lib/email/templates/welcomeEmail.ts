export interface WelcomeEmailData {
  clubName: string
  adminName: string
  loginUrl: string
  trialDays: number
  trialEndDate: string
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const subject = `Welcome to Gymnastics Club Manager - Your ${data.trialDays}-Day Trial Has Started!`

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
    .trial-info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .features { list-style: none; padding: 0; }
    .features li { padding: 8px 0; padding-left: 24px; position: relative; }
    .features li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Gymnastics Club Manager!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.adminName},</p>

      <p>Welcome to <strong>${data.clubName}</strong>! We're excited to have you on board. Your ${data.trialDays}-day free trial has officially started.</p>

      <div class="trial-info">
        <strong>Your Trial Details:</strong><br>
        Trial Period: ${data.trialDays} days<br>
        Trial Ends: ${data.trialEndDate}<br>
        No credit card required during trial
      </div>

      <p>Here's what you can do with Gymnastics Club Manager:</p>
      <ul class="features">
        <li>Manage student enrollments and records</li>
        <li>Track payments and generate invoices</li>
        <li>Communicate with parents through messaging</li>
        <li>Schedule events and competitions</li>
        <li>Generate reports and analytics</li>
        <li>And much more!</li>
      </ul>

      <p style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Get Started Now</a>
      </p>

      <p>If you have any questions or need help getting started, our support team is here to help. Just reply to this email.</p>

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
Welcome to Gymnastics Club Manager!

Hi ${data.adminName},

Welcome to ${data.clubName}! We're excited to have you on board. Your ${data.trialDays}-day free trial has officially started.

Your Trial Details:
- Trial Period: ${data.trialDays} days
- Trial Ends: ${data.trialEndDate}
- No credit card required during trial

Here's what you can do with Gymnastics Club Manager:
✓ Manage student enrollments and records
✓ Track payments and generate invoices
✓ Communicate with parents through messaging
✓ Schedule events and competitions
✓ Generate reports and analytics
✓ And much more!

Get started now: ${data.loginUrl}

If you have any questions or need help getting started, our support team is here to help. Just reply to this email.

Best regards,
The Gymnastics Club Manager Team

This email was sent to the admin of ${data.clubName}
© ${new Date().getFullYear()} Gymnastics Club Manager. All rights reserved.
  `

  return { subject, html, text }
}
