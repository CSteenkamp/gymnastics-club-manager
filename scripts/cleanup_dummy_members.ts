/**
 * Script to remove all dummy/test members from the database
 * Usage: npx tsx scripts/cleanup_dummy_members.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDummyMembers() {
  try {
    console.log('🧹 Starting cleanup of dummy members...\n')

    const clubId = 'ceres-gymnastics'

    // Get all children for the club
    const children = await prisma.child.findMany({
      where: { clubId },
      include: {
        parents: true
      }
    })

    console.log(`Found ${children.length} members to review\n`)

    // Delete all child records
    console.log('Deleting child records...')
    const deletedChildren = await prisma.child.deleteMany({
      where: { clubId }
    })
    console.log(`✓ Deleted ${deletedChildren.count} children`)

    // Delete invoices
    console.log('Deleting invoices...')
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: { clubId }
    })
    console.log(`✓ Deleted ${deletedInvoices.count} invoices`)

    // Delete invoice items
    console.log('Deleting invoice items...')
    const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({
      where: {
        invoice: {
          clubId
        }
      }
    })
    console.log(`✓ Deleted ${deletedInvoiceItems.count} invoice items`)

    // Delete payments
    console.log('Deleting payments...')
    const deletedPayments = await prisma.payment.deleteMany({
      where: { clubId }
    })
    console.log(`✓ Deleted ${deletedPayments.count} payments`)

    // Delete enrollments
    console.log('Deleting enrollments...')
    const deletedEnrollments = await prisma.enrollment.deleteMany({
      where: {
        child: {
          clubId
        }
      }
    })
    console.log(`✓ Deleted ${deletedEnrollments.count} enrollments`)

    // Delete attendance records
    console.log('Deleting attendance records...')
    const deletedAttendance = await prisma.attendance.deleteMany({
      where: { clubId }
    })
    console.log(`✓ Deleted ${deletedAttendance.count} attendance records`)

    // Delete data processing logs
    console.log('Deleting data processing logs...')
    const deletedLogs = await prisma.dataProcessingLog.deleteMany({
      where: { clubId }
    })
    console.log(`✓ Deleted ${deletedLogs.count} data processing logs`)

    // Delete parent users (only PARENT role users)
    console.log('Deleting parent users...')
    const deletedParents = await prisma.user.deleteMany({
      where: {
        clubId,
        role: 'PARENT'
      }
    })
    console.log(`✓ Deleted ${deletedParents.count} parent users`)

    console.log('\n✅ Cleanup complete! Database is ready for fresh import.\n')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDummyMembers()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
