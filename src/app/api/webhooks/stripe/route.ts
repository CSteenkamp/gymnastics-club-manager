import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id

  // Find club by stripe customer ID
  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!existingSubscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    'active': 'ACTIVE',
    'trialing': 'TRIALING',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'unpaid': 'UNPAID',
    'incomplete': 'INCOMPLETE',
    'incomplete_expired': 'INCOMPLETE_EXPIRED',
    'paused': 'PAUSED'
  }

  const status = statusMap[subscription.status] || 'ACTIVE'

  // Update subscription
  await prisma.subscriptions.update({
    where: { id: existingSubscription.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      status: status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      updatedAt: new Date()
    }
  })

  // Update club status
  await prisma.club.update({
    where: { id: existingSubscription.clubId },
    data: {
      subscriptionStatus: status as any,
      subscriptionExpiry: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date()
    }
  })

  console.log(`Updated subscription ${subscriptionId} to status: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!existingSubscription) {
    return
  }

  // Update subscription to canceled
  await prisma.subscriptions.update({
    where: { id: existingSubscription.id },
    data: {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      updatedAt: new Date()
    }
  })

  // Update club status
  await prisma.club.update({
    where: { id: existingSubscription.clubId },
    data: {
      subscriptionStatus: 'CANCELED',
      currentSubscriptionId: null,
      updatedAt: new Date()
    }
  })

  console.log(`Canceled subscription for customer: ${customerId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  const subscription = await prisma.subscriptions.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (!subscription) {
    return
  }

  // Create payment record
  await prisma.platform_payments.create({
    data: {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clubId: subscription.clubId,
      subscriptionId: subscription.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: 'SUCCEEDED',
      stripePaymentId: invoice.payment_intent as string,
      stripeInvoiceId: invoice.id,
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      metadata: {
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.hosted_invoice_url
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  // Update subscription status to ACTIVE
  await prisma.subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      updatedAt: new Date()
    }
  })

  await prisma.club.update({
    where: { id: subscription.clubId },
    data: {
      subscriptionStatus: 'ACTIVE',
      updatedAt: new Date()
    }
  })

  console.log(`Payment succeeded for invoice: ${invoice.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  const subscription = await prisma.subscriptions.findFirst({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (!subscription) {
    return
  }

  // Create failed payment record
  await prisma.platform_payments.create({
    data: {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clubId: subscription.clubId,
      subscriptionId: subscription.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'FAILED',
      stripeInvoiceId: invoice.id,
      metadata: {
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  // Update subscription to PAST_DUE
  await prisma.subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
      updatedAt: new Date()
    }
  })

  await prisma.club.update({
    where: { id: subscription.clubId },
    data: {
      subscriptionStatus: 'PAST_DUE',
      updatedAt: new Date()
    }
  })

  console.log(`Payment failed for invoice: ${invoice.id}`)

  // TODO: Send email notification about failed payment
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { stripeCustomerId: customerId },
    include: { club: true }
  })

  if (!existingSubscription) {
    return
  }

  console.log(`Trial will end for club: ${existingSubscription.club.name}`)

  // TODO: Send email notification about trial ending soon
}
