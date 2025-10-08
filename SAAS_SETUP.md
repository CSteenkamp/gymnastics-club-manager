# SaaS Platform Setup Guide

This guide will help you set up and configure the multi-tenant SaaS platform for your gymnastics club management system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Stripe Integration](#stripe-integration)
5. [Initial Data Seeding](#initial-data-seeding)
6. [Testing the System](#testing-the-system)
7. [Deployment](#deployment)

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Stripe account (for payment processing)
- Git (for version control)

## Environment Setup

1. **Copy the environment template:**

```bash
cp .env.example .env
```

2. **Configure your environment variables:**

Edit `.env` and update the following required variables:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/gymnastics_db"

# JWT Secret - Generate a strong random string
JWT_SECRET="your-secure-random-string-here"

# Stripe Keys - Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Created after setting up webhook

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

To generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Push the Prisma schema to your database:**

```bash
npx prisma db push
```

This will create all the necessary tables including:
- `clubs` - Multi-tenant club data
- `subscription_plans` - Available SaaS plans
- `subscriptions` - Club subscriptions
- `platform_payments` - SaaS billing payments
- All existing tables (users, children, payments, etc.)

3. **Generate Prisma client:**

```bash
npx prisma generate
```

## Stripe Integration

### 1. Create Stripe Account

- Sign up at [https://stripe.com](https://stripe.com)
- Verify your email and complete basic account setup

### 2. Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on **Developers** → **API keys**
3. Copy the **Publishable key** and **Secret key** (use test mode for development)
4. Add them to your `.env` file

### 3. Set Up Webhook

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli) or [ngrok](https://ngrok.com)
4. Select the following events to listen to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`) and add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 4. Local Testing with Stripe CLI (Optional)

For local development, you can use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will display your webhook signing secret. Update your `.env` file with this secret.

### 5. Configure Billing Portal

1. In Stripe Dashboard, go to **Settings** → **Billing**
2. Click on **Customer portal**
3. Enable the portal and configure allowed features:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscription
   - ✅ Update subscription (upgrade/downgrade)
4. Set your business information and branding
5. Save changes

## Initial Data Seeding

### 1. Seed Subscription Plans

Run the subscription plans seeder to create your SaaS pricing tiers:

```bash
npx tsx scripts/seed-plans.ts
```

This creates 6 plans:
- **Starter** - R499/month (50 students)
- **Starter Annual** - R4,790/year (20% savings)
- **Pro** - R999/month (200 students) - MOST POPULAR
- **Pro Annual** - R9,590/year (20% savings)
- **Elite** - R1,999/month (unlimited students)
- **Elite Annual** - R19,190/year (20% savings)

You can customize these plans by editing `/scripts/seed-plans.ts`

### 2. Update Existing Club (If Applicable)

If you have an existing club in your database, update it with SaaS fields:

```bash
npx tsx scripts/update-existing-club.ts
```

This will:
- Generate a slug for the club
- Set a 30-day trial period
- Update student count
- Mark onboarding as completed

### 3. Create Super Admin User

You need at least one SUPER_ADMIN user to access the platform management features.

**Option A:** Update an existing admin user via SQL:

```sql
UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';
```

**Option B:** Sign up a new club and then manually update the user role to SUPER_ADMIN.

## Testing the System

### 1. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 2. Test Club Signup Flow

1. Navigate to `/signup`
2. Fill in the 3-step wizard:
   - Step 1: Club information
   - Step 2: Admin account details
   - Step 3: Select a subscription plan
3. Complete signup
4. Verify you're redirected to the dashboard with a 14-day trial

### 3. Test Subscription Management

1. Login as club admin
2. Navigate to `/subscription`
3. View current plan and trial status
4. Click "Upgrade Plan" to see available plans
5. Test plan selection (in test mode, use Stripe test card: `4242 4242 4242 4242`)

### 4. Test Super Admin Dashboard

1. Login as SUPER_ADMIN
2. Navigate to `/super-admin/dashboard`
3. View platform statistics
4. Navigate to `/super-admin/clubs`
5. Test club management actions:
   - Activate club
   - Suspend club
   - Extend trial
   - View club details

### 5. Test Analytics Dashboard

1. Login as club admin
2. Navigate to `/analytics`
3. View charts and metrics
4. Verify data is displaying correctly

### 6. Test Invoice Download

1. Navigate to `/subscription`
2. Scroll to payment history
3. Click "Download" on a succeeded payment
4. Verify PDF invoice downloads correctly

## Stripe Test Cards

Use these test cards for testing payments:

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0027 | Authentication required |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0025 0000 3155 | Requires authentication (3D Secure 2) |

For more test cards, see [Stripe Testing Documentation](https://stripe.com/docs/testing)

## Deployment

### Environment Variables

Make sure to set all required environment variables in your production environment:

```env
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-production-jwt-secret"
STRIPE_SECRET_KEY="sk_live_..."  # Use live keys!
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # From production webhook
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Webhook Configuration

1. In Stripe Dashboard, switch to **Live mode**
2. Go to **Developers** → **Webhooks**
3. Add a new endpoint for your production URL
4. Select the same events as in test mode
5. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret

### Database Migrations

```bash
# Generate migration
npx prisma migrate dev --name production_setup

# Deploy to production
npx prisma migrate deploy
```

### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Key Features Implemented

### ✅ Multi-Tenant SaaS Architecture
- Each club has isolated data with `clubId`
- Unique slugs for potential subdomain routing
- Custom domain support ready

### ✅ Subscription Management
- 3-tier pricing (Starter/Pro/Elite)
- Monthly and annual billing
- 14-day free trial
- Automated billing with Stripe
- Customer portal for self-service management

### ✅ Super Admin Portal
- Platform-wide dashboard with metrics
- Club management (activate, suspend, extend trial)
- Revenue tracking (MRR, total revenue)
- Student and club statistics

### ✅ Billing & Invoicing
- Automated invoice generation
- PDF download for all successful payments
- Payment history tracking
- Failed payment handling

### ✅ Analytics Dashboard
- Revenue trends (6-month charts)
- Student enrollment tracking
- Attendance rate monitoring
- Payment status breakdown
- Top paying students

### ✅ Trial & Grace Period Management
- 14-day free trial on signup
- 7-day grace period after subscription expires
- Automated status updates
- Trial countdown in UI

## Common Issues & Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`

**Solution:**
- Verify PostgreSQL is running: `pg_ctl status`
- Check DATABASE_URL is correct in `.env`
- Ensure database exists: `createdb gymnastics_db`

### Stripe Webhook Not Working

**Error:** Webhook signature verification failed

**Solution:**
- Verify STRIPE_WEBHOOK_SECRET is correct
- Check webhook URL is publicly accessible
- For local dev, use Stripe CLI or ngrok
- Verify selected events match the webhook handler

### JWT Token Errors

**Error:** `Invalid or expired token`

**Solution:**
- Clear browser localStorage
- Verify JWT_SECRET is set in `.env`
- Re-login to get fresh token

### Plan Selection Not Working

**Error:** Plan limit exceeded

**Solution:**
- Check `studentCount` in clubs table matches reality
- Reduce student count or choose higher tier plan
- Verify plan `maxStudents` is correct

## Next Steps

After basic setup, consider implementing:

1. **Email Notifications**
   - Trial expiration warnings
   - Payment failure notifications
   - Welcome emails for new signups

2. **SMS Integration**
   - South African SMS providers (Africa's Talking, BulkSMS)
   - Payment reminders
   - Attendance notifications

3. **Subdomain Routing**
   - Configure DNS wildcard (*.yourdomain.com)
   - Middleware to route based on subdomain
   - SSL certificates for custom domains

4. **Accounting Integrations**
   - Xero API integration
   - QuickBooks integration
   - CSV export for accountants

5. **Coach Portal**
   - Limited access role for coaches
   - Attendance marking
   - Student roster view
   - Parent messaging

## Support

For issues or questions:
- Check the code comments in relevant files
- Review Stripe documentation: https://stripe.com/docs
- Review Prisma documentation: https://www.prisma.io/docs

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Use Stripe live keys (not test keys)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable rate limiting on API routes
- [ ] Review and test all user permissions
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure firewall rules
- [ ] Review POPIA compliance requirements

---

**Congratulations!** 🎉 Your multi-tenant SaaS platform is now ready to use!
