import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Member list with correct gender assignments based on your specifications
// D = Female, S = Male
const memberGenders: { firstName: string; lastName: string; gender: 'MALE' | 'FEMALE' }[] = [
  { firstName: "Aila", lastName: "Janse v Rensburg", gender: "FEMALE" }, // D
  { firstName: "Aj", lastName: "Du Toit", gender: "MALE" }, // S
  { firstName: "Ale", lastName: "Orffer", gender: "FEMALE" }, // D
  { firstName: "Alex", lastName: "Rands", gender: "MALE" }, // S
  { firstName: "Ankia", lastName: "Slabbert", gender: "FEMALE" }, // D
  { firstName: "Anlia", lastName: "Cillie", gender: "FEMALE" }, // D
  { firstName: "Ava", lastName: "Molosana", gender: "FEMALE" }, // D
  { firstName: "Bea", lastName: "Du Bruin", gender: "FEMALE" }, // D
  { firstName: "Ben", lastName: "Davin", gender: "MALE" }, // S
  { firstName: "Brenda", lastName: "Marais", gender: "FEMALE" }, // D
  { firstName: "Carli", lastName: "Prins", gender: "MALE" }, // S - Note: Carli can be male
  { firstName: "Corli", lastName: "Gibson", gender: "FEMALE" }, // D
  { firstName: "Dalene", lastName: "Vollgraaff", gender: "FEMALE" }, // D
  { firstName: "Edlyn", lastName: "van Rooyen", gender: "FEMALE" }, // D
  { firstName: "Elizabeth", lastName: "Cillie", gender: "FEMALE" }, // D
  { firstName: "Elizabeth", lastName: "Hill", gender: "FEMALE" }, // D
  { firstName: "Ellen-Mari", lastName: "Laubsher", gender: "FEMALE" }, // D
  { firstName: "Emma", lastName: "Nigrini", gender: "FEMALE" }, // D
  { firstName: "Emma", lastName: "Coetzee", gender: "FEMALE" }, // D
  { firstName: "Gabriella", lastName: "Du Toit", gender: "FEMALE" }, // D
  { firstName: "George", lastName: "Nigrini", gender: "MALE" }, // S
  { firstName: "Hanna", lastName: "Spamer", gender: "FEMALE" }, // D
  { firstName: "Irma-Ann", lastName: "Orffer", gender: "FEMALE" }, // D
  { firstName: "Isabella", lastName: "Van Wyk", gender: "FEMALE" }, // D
  { firstName: "Isabella", lastName: "de Jager", gender: "FEMALE" }, // D
  { firstName: "Janay", lastName: "Abrahms", gender: "FEMALE" }, // D
  { firstName: "Jani", lastName: "Nieuwenhuis", gender: "FEMALE" }, // D
  { firstName: "Jeanne", lastName: "vd Merwe", gender: "FEMALE" }, // D
  { firstName: "Joalet", lastName: "Gibson", gender: "FEMALE" }, // D
  { firstName: "Karli", lastName: "Brandt", gender: "FEMALE" }, // D
  { firstName: "Kaylen", lastName: "Lintnaar", gender: "FEMALE" }, // D
  { firstName: "Kaynique", lastName: "Pieterse", gender: "FEMALE" }, // D
  { firstName: "Kristi", lastName: "du Plessis", gender: "FEMALE" }, // D
  { firstName: "Layla", lastName: "du Plessis", gender: "FEMALE" }, // D
  { firstName: "Lea", lastName: "Karsten", gender: "FEMALE" }, // D
  { firstName: "Leah", lastName: "Goosen", gender: "FEMALE" }, // D
  { firstName: "Leah", lastName: "Frieslaar", gender: "FEMALE" }, // D
  { firstName: "Lia", lastName: "vd Merwe", gender: "FEMALE" }, // D
  { firstName: "Lidamari", lastName: "Bergman", gender: "FEMALE" }, // D
  { firstName: "Lilly", lastName: "Jacobs", gender: "FEMALE" }, // D
  { firstName: "Lilly-Rose", lastName: "Nortje", gender: "FEMALE" }, // D
  { firstName: "Mia", lastName: "Cuipik", gender: "FEMALE" }, // D
  { firstName: "Mikayla", lastName: "Nieuwenhuis", gender: "FEMALE" }, // D
  { firstName: "Nelis", lastName: "Van Zyl", gender: "MALE" }, // S
  { firstName: "Olivia", lastName: "Koster", gender: "FEMALE" }, // D
  { firstName: "Olivia", lastName: "Viljoen", gender: "FEMALE" }, // D
  { firstName: "Rhede", lastName: "Osche", gender: "FEMALE" }, // D
  { firstName: "Sofia", lastName: "Foster", gender: "FEMALE" }, // D
  { firstName: "Vera-Mari", lastName: "du Toit", gender: "FEMALE" }, // D
  { firstName: "Vicky", lastName: "du Plessis", gender: "FEMALE" }, // D
  { firstName: "Handre", lastName: "Kruger", gender: "MALE" }, // S
  { firstName: "EKSTRA", lastName: "INKOMSTE", gender: "FEMALE" }, // D
  { firstName: "Abigail", lastName: "Stassen", gender: "FEMALE" }, // D
  { firstName: "Lehane", lastName: "Olckers", gender: "FEMALE" }, // D
  { firstName: "Nicolaas", lastName: "Gibson", gender: "MALE" }, // S
  { firstName: "Phia", lastName: "Carolus", gender: "FEMALE" }, // D
  { firstName: "Alida", lastName: "du Toit", gender: "FEMALE" }, // D
  { firstName: "Benjamin", lastName: "Du Toit", gender: "MALE" }, // S
  { firstName: "Kaylie", lastName: "Du Toit", gender: "FEMALE" }, // D
  { firstName: "Taylor", lastName: "Pieterson", gender: "FEMALE" }, // D
  { firstName: "Alaiylah", lastName: "Gibson", gender: "FEMALE" }, // D
  { firstName: "Avah", lastName: "Maralack", gender: "FEMALE" }, // D
  { firstName: "Alexia", lastName: "Gibson", gender: "FEMALE" }, // D
  { firstName: "Ariah", lastName: "Maralack", gender: "FEMALE" } // D
]

async function fixGenders() {
  try {
    console.log('🔧 Fixing gender assignments...')

    // Get the club
    const club = await prisma.club.findFirst({
      where: { name: 'Ceres Gymnastics Club' }
    })

    if (!club) {
      throw new Error('Club not found')
    }

    let updatedCount = 0

    for (const memberGender of memberGenders) {
      try {
        // Find the child by name
        const child = await prisma.child.findFirst({
          where: {
            clubId: club.id,
            firstName: memberGender.firstName,
            lastName: memberGender.lastName
          }
        })

        if (child) {
          // Update the gender
          await prisma.child.update({
            where: { id: child.id },
            data: { gender: memberGender.gender }
          })

          console.log(`✅ Updated ${memberGender.firstName} ${memberGender.lastName} -> ${memberGender.gender}`)
          updatedCount++
        } else {
          console.log(`⚠️ Not found: ${memberGender.firstName} ${memberGender.lastName}`)
        }
      } catch (error) {
        console.error(`❌ Error updating ${memberGender.firstName} ${memberGender.lastName}:`, error)
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} gender assignments!`)

    // Summary stats
    const maleCount = memberGenders.filter(m => m.gender === 'MALE').length
    const femaleCount = memberGenders.filter(m => m.gender === 'FEMALE').length
    
    console.log(`📊 Summary (from your specifications):`)
    console.log(`   👦 Males (S): ${maleCount}`)
    console.log(`   👧 Females (D): ${femaleCount}`)
    console.log(`   📋 Total specified: ${memberGenders.length}`)

    // Verify in database
    const dbMales = await prisma.child.count({
      where: { clubId: club.id, gender: 'MALE' }
    })
    const dbFemales = await prisma.child.count({
      where: { clubId: club.id, gender: 'FEMALE' }
    })
    const dbNoGender = await prisma.child.count({
      where: { clubId: club.id, gender: null }
    })

    console.log(`📊 Database verification:`)
    console.log(`   👦 Males in DB: ${dbMales}`)
    console.log(`   👧 Females in DB: ${dbFemales}`)
    console.log(`   ❓ No gender: ${dbNoGender}`)

  } catch (error) {
    console.error('❌ Error fixing genders:', error)
    process.exit(1)
  }
}

// Run the script
fixGenders()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })