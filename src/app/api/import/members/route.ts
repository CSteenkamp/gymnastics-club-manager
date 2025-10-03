import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'

// Validation schema for CSV member data
const memberImportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  parentFirstName: z.string().min(1),
  parentLastName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  level: z.string().min(1),
  monthlyFee: z.string().transform(val => parseFloat(val.replace(/[R,\s]/g, ''))),
  status: z.enum(['ACTIVE', 'INACTIVE', 'WITHDRAWN']).default('ACTIVE'),
  dateOfBirth: z.string().optional().transform(val => {
    if (!val) return undefined
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date
  }),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  notes: z.string().optional(),
  // Financial data fields
  currentBalance: z.string().optional().transform(val => 
    val ? parseFloat(val.replace(/[R,\s]/g, '')) : 0
  ),
  sagfFee: z.string().optional().transform(val => 
    val ? parseFloat(val.replace(/[R,\s]/g, '')) : undefined
  ),
  equipmentFee: z.string().optional().transform(val => 
    val ? parseFloat(val.replace(/[R,\s]/g, '')) : undefined
  ),
  competitionFee: z.string().optional().transform(val => 
    val ? parseFloat(val.replace(/[R,\s]/g, '')) : undefined
  ),
  lastPaymentDate: z.string().optional().transform(val => {
    if (!val) return undefined
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date
  }),
  lastPaymentAmount: z.string().optional().transform(val => 
    val ? parseFloat(val.replace(/[R,\s]/g, '')) : undefined
  )
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only admins can import data
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const overwriteExisting = formData.get('overwriteExisting') === 'true'

    if (!file) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'File must be a CSV file'
      }, { status: 400 })
    }

    // Parse CSV data
    const fileContent = await file.text()
    let records: any[]

    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    } catch (parseError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid CSV format'
      }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'CSV file is empty'
      }, { status: 400 })
    }

    const results = {
      total: records.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 2 // +2 because CSV row 1 is headers, array is 0-indexed

      try {
        // Validate the record
        const validatedData = memberImportSchema.parse(record)

        // Check if parent already exists by email
        let parent = await prisma.user.findFirst({
          where: {
            clubId,
            email: validatedData.parentEmail
          }
        })

        // Create parent if doesn't exist
        if (!parent) {
          parent = await prisma.user.create({
            data: {
              clubId,
              email: validatedData.parentEmail,
              firstName: validatedData.parentFirstName,
              lastName: validatedData.parentLastName,
              phone: validatedData.parentPhone,
              password: 'temporary_password', // Will need to be reset
              role: 'PARENT'
            }
          })
        }

        // Check if child already exists
        const existingChild = await prisma.child.findFirst({
          where: {
            clubId,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            parents: {
              some: {
                id: parent.id
              }
            }
          }
        })

        if (existingChild && !overwriteExisting) {
          results.skipped++
          continue
        }

        let child
        if (existingChild && overwriteExisting) {
          // Update existing child
          child = await prisma.child.update({
            where: { id: existingChild.id },
            data: {
              level: validatedData.level,
              monthlyFee: validatedData.monthlyFee,
              status: validatedData.status,
              dateOfBirth: validatedData.dateOfBirth,
              gender: validatedData.gender,
              notes: validatedData.notes
            }
          })
          results.updated++
        } else {
          // Create new child
          child = await prisma.child.create({
            data: {
              clubId,
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              level: validatedData.level,
              monthlyFee: validatedData.monthlyFee,
              status: validatedData.status,
              dateOfBirth: validatedData.dateOfBirth,
              gender: validatedData.gender,
              notes: validatedData.notes,
              parents: {
                connect: { id: parent.id }
              }
            }
          })
          results.created++
        }

        // Create financial records if balance data exists
        if (validatedData.currentBalance && validatedData.currentBalance !== 0) {
          // Create an adjustment invoice for the current balance
          const invoice = await prisma.invoice.create({
            data: {
              clubId,
              userId: parent.id,
              invoiceNumber: `IMP-${Date.now()}-${child.id.slice(-4)}`,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              subtotal: validatedData.currentBalance,
              total: validatedData.currentBalance,
              status: validatedData.currentBalance > 0 ? 'PENDING' : 'PAID',
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              items: {
                create: {
                  childId: child.id,
                  description: 'Imported balance adjustment',
                  amount: validatedData.currentBalance,
                  type: 'ADJUSTMENT'
                }
              }
            }
          })

          // Add additional fee items if they exist
          const additionalItems = []
          
          if (validatedData.sagfFee) {
            additionalItems.push({
              invoiceId: invoice.id,
              childId: child.id,
              description: 'SAGF Registration Fee',
              amount: validatedData.sagfFee,
              type: 'REGISTRATION' as const
            })
          }

          if (validatedData.equipmentFee) {
            additionalItems.push({
              invoiceId: invoice.id,
              childId: child.id,
              description: 'Equipment Fee',
              amount: validatedData.equipmentFee,
              type: 'EQUIPMENT' as const
            })
          }

          if (validatedData.competitionFee) {
            additionalItems.push({
              invoiceId: invoice.id,
              childId: child.id,
              description: 'Competition Fee',
              amount: validatedData.competitionFee,
              type: 'COMPETITION' as const
            })
          }

          if (additionalItems.length > 0) {
            await prisma.invoiceItem.createMany({
              data: additionalItems
            })

            // Update invoice total
            const itemsTotal = additionalItems.reduce((sum, item) => sum + Number(item.amount), 0)
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                subtotal: validatedData.currentBalance + itemsTotal,
                total: validatedData.currentBalance + itemsTotal
              }
            })
          }
        }

        // Create payment record if last payment data exists
        if (validatedData.lastPaymentDate && validatedData.lastPaymentAmount) {
          await prisma.payment.create({
            data: {
              clubId,
              parentId: parent.id,
              amount: validatedData.lastPaymentAmount,
              status: 'COMPLETED',
              method: 'EFT', // Default assumption
              notes: 'Imported historical payment',
              paidAt: validatedData.lastPaymentDate,
              processedAt: validatedData.lastPaymentDate
            }
          })
        }

        // Log the data import
        await prisma.dataProcessingLog.create({
          data: {
            clubId,
            userId,
            childId: child.id,
            action: existingChild ? 'UPDATE' : 'CREATE',
            purpose: 'Member data import from CSV',
            dataTypes: ['child_profile', 'financial_data', 'parent_data'],
            legalBasis: 'LEGITIMATE_INTERESTS',
            source: 'csv_import',
            metadata: {
              fileName: file.name,
              rowNumber,
              importedFields: Object.keys(validatedData)
            }
          }
        })

      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error)
        results.errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`)
        results.skipped++
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
    })

  } catch (error: any) {
    console.error('CSV import error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Import failed'
    }, { status: 500 })
  }
}

// GET endpoint to download CSV template
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    // Generate CSV template
    const csvTemplate = `firstName,lastName,parentFirstName,parentLastName,parentEmail,parentPhone,level,monthlyFee,status,dateOfBirth,gender,notes,currentBalance,sagfFee,equipmentFee,competitionFee,lastPaymentDate,lastPaymentAmount
Emma,Smith,John,Smith,john.smith@email.com,0821234567,Level 1,R350,ACTIVE,2015-03-15,FEMALE,"",R0,R100,R0,R0,,
Liam,Johnson,Sarah,Johnson,sarah.johnson@email.com,0829876543,RR,R250,ACTIVE,2017-08-22,MALE,"Holiday program participant",R-350,R100,R50,R0,2023-12-15,R400`

    return new Response(csvTemplate, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="member_import_template.csv"'
      }
    })

  } catch (error: any) {
    console.error('Template download error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to generate template'
    }, { status: 500 })
  }
}