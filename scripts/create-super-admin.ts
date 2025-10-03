import { prisma } from '../src/lib/prisma'
import { hashPassword } from '../src/lib/auth'

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating super admin user...')

    const email = 'superadmin@gymnastics.co.za'
    const password = 'superadmin123'

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { 
        email,
        role: 'SUPER_ADMIN'
      }
    })

    if (existingSuperAdmin) {
      console.log('✅ Super admin already exists:', email)
      return
    }

    // Create a system club for super admin
    let systemClub = await prisma.club.findFirst({
      where: { id: 'system' }
    })

    if (!systemClub) {
      systemClub = await prisma.club.create({
        data: {
          id: 'system',
          name: 'System Administration',
          email: 'system@gymnastics.co.za',
          settings: {
            isSystemClub: true
          }
        }
      })
      console.log('✅ Created system club')
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Create super admin user
    const superAdmin = await prisma.user.create({
      data: {
        clubId: systemClub.id,
        email,
        firstName: 'Super',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        emailNotifications: true,
        smsNotifications: false
      }
    })

    console.log('✅ Super admin created successfully!')
    console.log('📧 Email:', email)
    console.log('🔐 Password:', password)
    console.log('🆔 User ID:', superAdmin.id)
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()