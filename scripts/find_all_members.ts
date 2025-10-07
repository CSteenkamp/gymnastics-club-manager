/**
 * Script to find all members regardless of club
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findAllMembers() {
  try {
    const children = await prisma.child.findMany({
      include: {
        parents: true
      }
    })

    console.log(`\n📊 Found ${children.length} members across ALL clubs:\n`)

    children.forEach((child, index) => {
      console.log(`${index + 1}. ${child.firstName} ${child.lastName}`)
      console.log(`   ID: ${child.id}`)
      console.log(`   Club ID: ${child.clubId}`)
      console.log(`   Level: ${child.level}`)
      console.log(`   Status: ${child.status}`)
      console.log(`   Created: ${child.createdAt}`)
      console.log()
    })

    // Also show all clubs
    const clubs = await prisma.club.findMany()
    console.log(`\n🏢 Clubs in database:\n`)
    clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name}`)
      console.log(`   ID: ${club.id}`)
      console.log()
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findAllMembers()
