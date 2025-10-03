import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Member {
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
}

const members: Member[] = [
  { firstName: "Aila", lastName: "Janse v Rensburg", gender: "FEMALE" },
  { firstName: "Aj", lastName: "Du Toit", gender: "MALE" },
  { firstName: "Ale", lastName: "Orffer", gender: "FEMALE" },
  { firstName: "Alex", lastName: "Rands", gender: "MALE" },
  { firstName: "Ankia", lastName: "Slabbert", gender: "FEMALE" },
  { firstName: "Anlia", lastName: "Cillie", gender: "FEMALE" },
  { firstName: "Ava", lastName: "Molosana", gender: "FEMALE" },
  { firstName: "Bea", lastName: "Du Bruin", gender: "FEMALE" },
  { firstName: "Ben", lastName: "Davin", gender: "MALE" },
  { firstName: "Brenda", lastName: "Marais", gender: "FEMALE" },
  { firstName: "Carli", lastName: "Prins", gender: "MALE" },
  { firstName: "Corli", lastName: "Gibson", gender: "FEMALE" },
  { firstName: "Dalene", lastName: "Vollgraaff", gender: "FEMALE" },
  { firstName: "Edlyn", lastName: "van Rooyen", gender: "FEMALE" },
  { firstName: "Elizabeth", lastName: "Cillie", gender: "FEMALE" },
  { firstName: "Elizabeth", lastName: "Hill", gender: "FEMALE" },
  { firstName: "Ellen-Mari", lastName: "Laubsher", gender: "FEMALE" },
  { firstName: "Emma", lastName: "Nigrini", gender: "FEMALE" },
  { firstName: "Emma", lastName: "Coetzee", gender: "FEMALE" },
  { firstName: "Gabriella", lastName: "Du Toit", gender: "FEMALE" },
  { firstName: "George", lastName: "Nigrini", gender: "MALE" },
  { firstName: "Hanna", lastName: "Spamer", gender: "FEMALE" },
  { firstName: "Irma-Ann", lastName: "Orffer", gender: "FEMALE" },
  { firstName: "Isabella", lastName: "Van Wyk", gender: "FEMALE" },
  { firstName: "Isabella", lastName: "de Jager", gender: "FEMALE" },
  { firstName: "Janay", lastName: "Abrahms", gender: "FEMALE" },
  { firstName: "Jani", lastName: "Nieuwenhuis", gender: "FEMALE" },
  { firstName: "Jeanne", lastName: "vd Merwe", gender: "FEMALE" },
  { firstName: "Joalet", lastName: "Gibson", gender: "FEMALE" },
  { firstName: "Karli", lastName: "Brandt", gender: "FEMALE" },
  { firstName: "Kaylen", lastName: "Lintnaar", gender: "FEMALE" },
  { firstName: "Kaynique", lastName: "Pieterse", gender: "FEMALE" },
  { firstName: "Kristi", lastName: "du Plessis", gender: "FEMALE" },
  { firstName: "Layla", lastName: "du Plessis", gender: "FEMALE" },
  { firstName: "Lea", lastName: "Karsten", gender: "FEMALE" },
  { firstName: "Leah", lastName: "Goosen", gender: "FEMALE" },
  { firstName: "Leah", lastName: "Frieslaar", gender: "FEMALE" },
  { firstName: "Lia", lastName: "vd Merwe", gender: "FEMALE" },
  { firstName: "Lidamari", lastName: "Bergman", gender: "FEMALE" },
  { firstName: "Lilly", lastName: "Jacobs", gender: "FEMALE" },
  { firstName: "Lilly-Rose", lastName: "Nortje", gender: "FEMALE" },
  { firstName: "Mia", lastName: "Cuipik", gender: "FEMALE" },
  { firstName: "Mikayla", lastName: "Nieuwenhuis", gender: "FEMALE" },
  { firstName: "Nelis", lastName: "Van Zyl", gender: "MALE" },
  { firstName: "Olivia", lastName: "Koster", gender: "FEMALE" },
  { firstName: "Olivia", lastName: "Viljoen", gender: "FEMALE" },
  { firstName: "Rhede", lastName: "Osche", gender: "FEMALE" },
  { firstName: "Sofia", lastName: "Foster", gender: "FEMALE" },
  { firstName: "Vera-Mari", lastName: "du Toit", gender: "FEMALE" },
  { firstName: "Vicky", lastName: "du Plessis", gender: "FEMALE" },
  { firstName: "Handre", lastName: "Kruger", gender: "MALE" },
  { firstName: "EKSTRA", lastName: "INKOMSTE", gender: "FEMALE" },
  { firstName: "Abigail", lastName: "Stassen", gender: "FEMALE" },
  { firstName: "Lehane", lastName: "Olckers", gender: "FEMALE" },
  { firstName: "Nicolaas", lastName: "Gibson", gender: "MALE" },
  { firstName: "Phia", lastName: "Carolus", gender: "FEMALE" },
  { firstName: "Alida", lastName: "du Toit", gender: "FEMALE" },
  { firstName: "Benjamin", lastName: "Du Toit", gender: "MALE" },
  { firstName: "Kaylie", lastName: "Du Toit", gender: "FEMALE" },
  { firstName: "Taylor", lastName: "Pieterson", gender: "FEMALE" },
  { firstName: "Alaiylah", lastName: "Gibson", gender: "FEMALE" },
  { firstName: "Avah", lastName: "Maralack", gender: "FEMALE" },
  { firstName: "Alexia", lastName: "Gibson", gender: "FEMALE" },
  { firstName: "Ariah", lastName: "Maralack", gender: "FEMALE" }
]

async function addMembers() {
  try {
    console.log('🏃‍♀️ Adding Ceres Gymnastics Club members...')

    // Get the club ID
    const club = await prisma.club.findFirst({
      where: { name: 'Ceres Gymnastics Club' }
    })

    if (!club) {
      throw new Error('Club not found. Please run the seed script first.')
    }

    // Get a parent to assign children to (we'll use the demo parent)
    const parent = await prisma.user.findFirst({
      where: { 
        clubId: club.id,
        role: 'PARENT'
      }
    })

    if (!parent) {
      throw new Error('No parent found. Please run the seed script first.')
    }

    console.log(`👨‍👩‍👧‍👦 Found parent: ${parent.firstName} ${parent.lastName}`)

    // Assign levels based on typical distribution
    const levels = ['Level RR', 'Level R', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
    const getRandomLevel = () => levels[Math.floor(Math.random() * levels.length)]

    // Monthly fee based on level (in cents for Prisma Decimal)
    const getLevelFee = (level: string) => {
      switch (level) {
        case 'Level RR': return 450
        case 'Level R': return 500
        case 'Level 1': return 550
        case 'Level 2': return 600
        case 'Level 3': return 650
        case 'Level 4': return 700
        case 'Level 5': return 750
        default: return 550
      }
    }

    let addedCount = 0

    for (const member of members) {
      try {
        const level = getRandomLevel()
        const monthlyFee = getLevelFee(level)

        const child = await prisma.child.create({
          data: {
            clubId: club.id,
            firstName: member.firstName,
            lastName: member.lastName,
            gender: member.gender,
            level: level,
            status: 'ACTIVE',
            monthlyFee: monthlyFee,
            parents: {
              connect: {
                id: parent.id
              }
            }
          }
        })

        console.log(`✅ Added ${member.firstName} ${member.lastName} (${member.gender}) - ${level}`)
        addedCount++

        // Create activity log
        await prisma.childActivity.create({
          data: {
            childId: child.id,
            type: 'ENROLLMENT',
            description: `Child enrolled in ${level}`,
            newValue: level,
            createdBy: parent.id
          }
        })

      } catch (error) {
        console.error(`❌ Failed to add ${member.firstName} ${member.lastName}:`, error)
      }
    }

    console.log(`🎉 Successfully added ${addedCount} members to Ceres Gymnastics Club!`)
    
    // Summary stats
    const maleCount = members.filter(m => m.gender === 'MALE').length
    const femaleCount = members.filter(m => m.gender === 'FEMALE').length
    
    console.log(`📊 Summary:`)
    console.log(`   👦 Males: ${maleCount}`)
    console.log(`   👧 Females: ${femaleCount}`)
    console.log(`   📋 Total: ${members.length}`)

  } catch (error) {
    console.error('❌ Error adding members:', error)
    process.exit(1)
  }
}

// Run the script
addMembers()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })