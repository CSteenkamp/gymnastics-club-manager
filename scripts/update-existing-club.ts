import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Updating existing club with SaaS fields...')

  // Find existing club
  const club = await prisma.clubs.findFirst({
    where: {
      name: 'Ceres Gymnastics Club'
    }
  })

  if (!club) {
    console.log('⚠️  No existing club found. Skipping update.')
    return
  }

  // Set trial period (30 days from now for existing club)
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)

  // Update club with SaaS fields
  await prisma.clubs.update({
    where: { id: club.id },
    data: {
      slug: 'ceres-gymnastics',
      subscriptionStatus: 'TRIAL',
      trialEndsAt,
      onboardingCompleted: true,
      studentCount: 0 // Will be updated by actual count
    }
  })

  // Count actual students
  const studentCount = await prisma.children.count({
    where: {
      clubId: club.id,
      status: 'ACTIVE'
    }
  })

  // Update student count
  await prisma.clubs.update({
    where: { id: club.id },
    data: {
      studentCount
    }
  })

  console.log(`✅ Updated club: ${club.name}`)
  console.log(`   - Slug: ceres-gymnastics`)
  console.log(`   - Status: TRIAL`)
  console.log(`   - Trial ends: ${trialEndsAt.toLocaleDateString()}`)
  console.log(`   - Student count: ${studentCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Error updating club:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
