import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Ceres Gymnastics Club
  const club = await prisma.clubs.upsert({
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
      },
      updatedAt: new Date()
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
    await prisma.fee_structures.upsert({
      where: {
        clubId_level: {
          clubId: club.id,
          level: fee.level
        }
      },
      update: {},
      create: {
        id: randomUUID(),
        clubId: club.id,
        level: fee.level,
        monthlyFee: fee.monthlyFee,
        description: fee.description,
        updatedAt: new Date()
      }
    })
  }

  console.log(`✅ Created ${feeStructures.length} fee structures`)

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.users.upsert({
    where: {
      clubId_email: {
        clubId: club.id,
        email: 'admin@ceresgymnastics.co.za'
      }
    },
    update: {},
    create: {
      id: randomUUID(),
      clubId: club.id,
      email: 'admin@ceresgymnastics.co.za',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+27123456789',
      password: hashedPassword,
      role: 'ADMIN',
      updatedAt: new Date()
    }
  })

  console.log(`✅ Created admin user: ${admin.email}`)

  // Create demo parent user
  const parentPassword = await bcrypt.hash('parent123', 12)
  const parent = await prisma.users.upsert({
    where: {
      clubId_email: {
        clubId: club.id,
        email: 'parent@example.com'
      }
    },
    update: {},
    create: {
      id: randomUUID(),
      clubId: club.id,
      email: 'parent@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+27987654321',
      password: parentPassword,
      role: 'PARENT',
      updatedAt: new Date()
    }
  })

  console.log(`✅ Created demo parent: ${parent.email}`)

  // Create demo children
  const child1 = await prisma.children.create({
    data: {
      id: randomUUID(),
      clubId: club.id,
      firstName: 'Emma',
      lastName: 'Smith',
      dateOfBirth: new Date('2015-03-15'),
      level: 'Level 2',
      status: 'ACTIVE',
      updatedAt: new Date(),
      users: {
        connect: {
          id: parent.id
        }
      }
    }
  })

  const child2 = await prisma.children.create({
    data: {
      id: randomUUID(),
      clubId: club.id,
      firstName: 'Sophia',
      lastName: 'Smith',
      dateOfBirth: new Date('2013-07-22'),
      level: 'Level 4',
      status: 'ACTIVE',
      updatedAt: new Date(),
      users: {
        connect: {
          id: parent.id
        }
      }
    }
  })

  console.log(`✅ Created demo children: ${child1.firstName}, ${child2.firstName}`)

  // Create demo coach
  const coachPassword = await bcrypt.hash('coach123', 12)
  const coach = await prisma.users.upsert({
    where: {
      clubId_email: {
        clubId: club.id,
        email: 'coach@ceresgymnastics.co.za'
      }
    },
    update: {},
    create: {
      id: randomUUID(),
      clubId: club.id,
      email: 'coach@ceresgymnastics.co.za',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+27123456000',
      password: coachPassword,
      role: 'COACH',
      updatedAt: new Date()
    }
  })

  console.log(`✅ Created demo coach: ${coach.email}`)

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
    await prisma.classes.create({
      data: {
        id: randomUUID(),
        clubId: club.id,
        name: classData.name,
        level: classData.level,
        description: `Training class for ${classData.level} gymnasts`,
        updatedAt: new Date()
      }
    })
  }

  console.log(`✅ Created ${classes.length} classes`)

  // Create demo schedules
  const schedules = [
    {
      name: 'Level 2 Monday Training',
      level: 'Level 2',
      dayOfWeek: 'MONDAY',
      startTime: '16:00',
      endTime: '17:30',
      location: 'Main Gym',
      maxCapacity: 12
    },
    {
      name: 'Level 2 Wednesday Training',
      level: 'Level 2',
      dayOfWeek: 'WEDNESDAY',
      startTime: '16:00',
      endTime: '17:30',
      location: 'Main Gym',
      maxCapacity: 12
    },
    {
      name: 'Level 4 Tuesday Training',
      level: 'Level 4',
      dayOfWeek: 'TUESDAY',
      startTime: '17:00',
      endTime: '19:00',
      location: 'Main Gym',
      maxCapacity: 10
    },
    {
      name: 'Level 4 Thursday Training',
      level: 'Level 4',
      dayOfWeek: 'THURSDAY',
      startTime: '17:00',
      endTime: '19:00',
      location: 'Main Gym',
      maxCapacity: 10
    }
  ]

  for (const schedule of schedules) {
    await prisma.schedules.create({
      data: {
        id: randomUUID(),
        clubId: club.id,
        name: schedule.name,
        level: schedule.level,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        maxCapacity: schedule.maxCapacity,
        isActive: true,
        coachId: coach.id,
        updatedAt: new Date()
      }
    })
  }

  console.log(`✅ Created ${schedules.length} schedules`)

  // Enroll children in schedules
  const level2Schedules = await prisma.schedules.findMany({
    where: { clubId: club.id, level: 'Level 2' }
  })

  for (const schedule of level2Schedules) {
    await prisma.enrollments.create({
      data: {
        id: randomUUID(),
        clubId: club.id,
        childId: child1.id,
        scheduleId: schedule.id,
        startDate: new Date(),
        isActive: true,
        updatedAt: new Date()
      }
    })
  }

  const level4Schedules = await prisma.schedules.findMany({
    where: { clubId: club.id, level: 'Level 4' }
  })

  for (const schedule of level4Schedules) {
    await prisma.enrollments.create({
      data: {
        id: randomUUID(),
        clubId: club.id,
        childId: child2.id,
        scheduleId: schedule.id,
        startDate: new Date(),
        isActive: true,
        updatedAt: new Date()
      }
    })
  }

  console.log(`✅ Enrolled children in schedules`)

  console.log('🎉 Database seeded successfully!')
  console.log('\n📝 Login credentials:')
  console.log('Admin: admin@ceresgymnastics.co.za / admin123')
  console.log('Parent: parent@example.com / parent123')
  console.log('Coach: coach@ceresgymnastics.co.za / coach123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })