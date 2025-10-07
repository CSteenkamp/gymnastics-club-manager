import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding subscription plans...')

  // Delete existing plans
  await prisma.subscription_plans.deleteMany({})

  // Create subscription plans
  const plans = [
    {
      id: randomUUID(),
      name: 'Starter',
      description: 'Perfect for small clubs just getting started',
      price: 499,
      currency: 'ZAR',
      interval: 'MONTHLY',
      maxStudents: 50,
      trialDays: 14,
      isActive: true,
      features: {
        'Student Management': true,
        'Invoice Generation': true,
        'Payment Tracking': true,
        'Basic Reporting': true,
        'Email Support': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      name: 'Pro',
      description: 'For growing clubs with advanced needs',
      price: 999,
      currency: 'ZAR',
      interval: 'MONTHLY',
      maxStudents: 200,
      trialDays: 14,
      isActive: true,
      features: {
        'Everything in Starter': true,
        'Unlimited Students': 'Up to 200',
        'Advanced Reporting': true,
        'Custom Branding': true,
        'SMS Notifications': true,
        'Priority Support': true,
        'Event Management': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      name: 'Elite',
      description: 'Unlimited students and premium features',
      price: 1999,
      currency: 'ZAR',
      interval: 'MONTHLY',
      maxStudents: null, // Unlimited
      trialDays: 14,
      isActive: true,
      features: {
        'Everything in Pro': true,
        'Unlimited Students': true,
        'Custom Domain': true,
        'WhatsApp Integration': true,
        'Dedicated Account Manager': true,
        'API Access': true,
        'White-label Options': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Annual plans (20% discount)
    {
      id: randomUUID(),
      name: 'Starter Annual',
      description: 'Perfect for small clubs - Save 20% with annual billing',
      price: 4790, // 499 * 12 * 0.8
      currency: 'ZAR',
      interval: 'ANNUALLY',
      maxStudents: 50,
      trialDays: 14,
      isActive: true,
      features: {
        'Student Management': true,
        'Invoice Generation': true,
        'Payment Tracking': true,
        'Basic Reporting': true,
        'Email Support': true,
        'Save 20%': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      name: 'Pro Annual',
      description: 'For growing clubs - Save 20% with annual billing',
      price: 9590, // 999 * 12 * 0.8
      currency: 'ZAR',
      interval: 'ANNUALLY',
      maxStudents: 200,
      trialDays: 14,
      isActive: true,
      features: {
        'Everything in Starter': true,
        'Unlimited Students': 'Up to 200',
        'Advanced Reporting': true,
        'Custom Branding': true,
        'SMS Notifications': true,
        'Priority Support': true,
        'Event Management': true,
        'Save 20%': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      name: 'Elite Annual',
      description: 'Unlimited everything - Save 20% with annual billing',
      price: 19190, // 1999 * 12 * 0.8
      currency: 'ZAR',
      interval: 'ANNUALLY',
      maxStudents: null,
      trialDays: 14,
      isActive: true,
      features: {
        'Everything in Pro': true,
        'Unlimited Students': true,
        'Custom Domain': true,
        'WhatsApp Integration': true,
        'Dedicated Account Manager': true,
        'API Access': true,
        'White-label Options': true,
        'Save 20%': true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  for (const plan of plans) {
    await prisma.subscription_plans.create({
      data: plan
    })
  }

  console.log(`✅ Created ${plans.length} subscription plans`)
  console.log('\nPlans:')
  console.log('- Starter: R499/month (up to 50 students)')
  console.log('- Pro: R999/month (up to 200 students)')
  console.log('- Elite: R1999/month (unlimited students)')
  console.log('\n+ Annual plans with 20% discount')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding subscription plans:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
