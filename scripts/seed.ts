import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Ceres Gymnastics Club
  const club = await prisma.club.upsert({
    where: { id: 'ceres-gymnastics' },
    update: {},
    create: {
      id: 'ceres-gymnastics',
      name: 'Ceres Gymnastics Club',
      email: 'info@ceresgymnastics.co.za',
      phone: '+27123456789',
      address: 'Ceres, Western Cape, South Africa',
      settings: {
        currency: 'ZAR',
        timezone: 'Africa/Johannesburg'
      }
    }
  })

  console.log(`✅ Created club: ${club.name}`)

  // Create fee structures
  const feeStructures = [
    { level: 'RR', monthlyFee: 350.00, description: 'Recreational Recreational' },
    { level: 'R', monthlyFee: 400.00, description: 'Recreational' },
    { level: 'Pre-Level 1', monthlyFee: 450.00, description: 'Pre-Level 1' },
    { level: 'Level 1', monthlyFee: 500.00, description: 'Level 1' },
    { level: 'Level 2', monthlyFee: 550.00, description: 'Level 2' },
    { level: 'Level 3', monthlyFee: 600.00, description: 'Level 3' },
    { level: 'Level 4', monthlyFee: 650.00, description: 'Level 4' },
    { level: 'Level 5', monthlyFee: 700.00, description: 'Level 5' }
  ]

  for (const fee of feeStructures) {
    await prisma.feeStructure.upsert({
      where: {
        clubId_level: {
          clubId: club.id,
          level: fee.level
        }
      },
      update: {},
      create: {
        clubId: club.id,
        level: fee.level,
        monthlyFee: fee.monthlyFee,
        description: fee.description
      }
    })
  }

  console.log(`✅ Created ${feeStructures.length} fee structures`)

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: {
      clubId_email: {
        clubId: club.id,
        email: 'admin@ceresgymnastics.co.za'
      }
    },
    update: {},
    create: {
      clubId: club.id,
      email: 'admin@ceresgymnastics.co.za',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+27123456789',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log(`✅ Created admin user: ${admin.email}`)

  // Create demo parent user
  const parentPassword = await bcrypt.hash('parent123', 12)
  const parent = await prisma.user.upsert({
    where: {
      clubId_email: {
        clubId: club.id,
        email: 'parent@example.com'
      }
    },
    update: {},
    create: {
      clubId: club.id,
      email: 'parent@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+27987654321',
      password: parentPassword,
      role: 'PARENT'
    }
  })

  console.log(`✅ Created demo parent: ${parent.email}`)

  // Create demo children
  const child1 = await prisma.child.create({
    data: {
      clubId: club.id,
      firstName: 'Emma',
      lastName: 'Smith',
      dateOfBirth: new Date('2015-03-15'),
      level: 'Level 2',
      status: 'ACTIVE',
      parents: {
        connect: {
          id: parent.id
        }
      }
    }
  })

  const child2 = await prisma.child.create({
    data: {
      clubId: club.id,
      firstName: 'Sophia',
      lastName: 'Smith',
      dateOfBirth: new Date('2013-07-22'),
      level: 'Level 4',
      status: 'ACTIVE',
      parents: {
        connect: {
          id: parent.id
        }
      }
    }
  })

  console.log(`✅ Created demo children: ${child1.firstName}, ${child2.firstName}`)

  // Create some demo classes
  const classes = [
    { name: 'Recreational Stars', level: 'RR' },
    { name: 'Recreational Rockets', level: 'R' },
    { name: 'Pre-Level Preparation', level: 'Pre-Level 1' },
    { name: 'Level 1 Squad', level: 'Level 1' },
    { name: 'Level 2 Squad', level: 'Level 2' },
    { name: 'Level 3 Squad', level: 'Level 3' },
    { name: 'Level 4 Squad', level: 'Level 4' },
    { name: 'Level 5 Squad', level: 'Level 5' }
  ]

  for (const classData of classes) {
    await prisma.class.create({
      data: {
        clubId: club.id,
        name: classData.name,
        level: classData.level,
        description: `Training class for ${classData.level} gymnasts`
      }
    })
  }

  console.log(`✅ Created ${classes.length} classes`)

  console.log('🎉 Database seeded successfully!')
  console.log('\n📝 Login credentials:')
  console.log('Admin: admin@ceresgymnastics.co.za / admin123')
  console.log('Parent: parent@example.com / parent123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })