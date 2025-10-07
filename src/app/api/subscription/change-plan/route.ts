import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || !payload.clubId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { newPlanId } = await request.json()

    if (!newPlanId) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Get club and current subscription
    const club = await prisma.club.findUnique({
      where: { id: payload.clubId },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    })

    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    // Get new plan
    const newPlan = await prisma.subscription_plans.findUnique({
      where: { id: newPlanId }
    })

    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Check student count against new plan limits
    if (newPlan.maxStudents && club.studentCount > newPlan.maxStudents) {
      return NextResponse.json(
        {
          success: false,
          error: `Your club has ${club.studentCount} students, but this plan only allows ${newPlan.maxStudents}. Please remove students before downgrading.`
        },
        { status: 400 }
      )
    }

    // If club is in trial, create new subscription
    if (club.subscriptionStatus === 'TRIAL') {
      // Create Stripe customer if doesn't exist
      let stripeCustomerId = club.subscription?.stripeCustomerId

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: club.email,
          name: club.name,
          metadata: {
            clubId: club.id
          }
        })
        stripeCustomerId = customer.id
      }

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price_data: {
              currency: newPlan.currency.toLowerCase(),
              product_data: {
                name: newPlan.name,
                description: newPlan.description || undefined
              },
              unit_amount: Math.round(Number(newPlan.price) * 100), // Convert to cents
              recurring: {
                interval: newPlan.interval.toLowerCase() as 'month' | 'year'
              }
            }
          }
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      })

      // Create subscription in database
      const subscription = await prisma.subscriptions.create({
        data: {
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clubId: club.id,
          planId: newPlan.id,
          status: 'INCOMPLETE',
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Update club
      await prisma.club.update({
        where: { id: club.id },
        data: {
          currentSubscriptionId: subscription.id,
          subscriptionStatus: 'INCOMPLETE',
          updatedAt: new Date()
        }
      })

      // Get client secret for payment
      const invoice = stripeSubscription.latest_invoice as Stripe.Invoice
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: subscription.id,
          clientSecret: paymentIntent.client_secret,
          requiresPayment: true
        }
      })
    }

    // If club has active subscription, update it via Stripe
    if (club.subscription?.stripeSubscriptionId) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        club.subscription.stripeSubscriptionId
      )

      // Update the subscription in Stripe
      const updatedSubscription = await stripe.subscriptions.update(
        club.subscription.stripeSubscriptionId,
        {
          items: [
            {
              id: stripeSubscription.items.data[0].id,
              price_data: {
                currency: newPlan.currency.toLowerCase(),
                product_data: {
                  name: newPlan.name,
                  description: newPlan.description || undefined
                },
                unit_amount: Math.round(Number(newPlan.price) * 100),
                recurring: {
                  interval: newPlan.interval.toLowerCase() as 'month' | 'year'
                }
              }
            }
          ],
          proration_behavior: 'create_prorations'
        }
      )

      // Update subscription in database
      await prisma.subscriptions.update({
        where: { id: club.subscription.id },
        data: {
          planId: newPlan.id,
          currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: club.subscription.id,
          message: 'Plan updated successfully',
          requiresPayment: false
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'No active subscription found' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error changing plan:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
