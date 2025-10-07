/**
 * Script to check all members in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMembers() {
  try {
    const clubId = '01939a58-7fa8-7000-ba07-8a1802925a55'

    const children = await prisma.child.findMany({
      where: { clubId },
      include: {
        parents: true
      }
    })

    console.log(`\n📊 Found ${children.length} members:\n`)

    children.forEach((child, index) => {
      console.log(`${index + 1}. ${child.firstName} ${child.lastName}`)
      console.log(`   ID: ${child.id}`)
      console.log(`   Level: ${child.level}`)
      console.log(`   Status: ${child.status}`)
      console.log(`   Created: ${child.createdAt}`)
      console.log(`   Parents: ${child.parents.length}`)
      console.log()
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMembers()
