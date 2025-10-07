import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceItem {
  description: string
  quantity: number
  amount: number
}

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  month: number
  year: number
  status: string
  total: number
  paymentReference?: string
  parentName: string
  parentEmail: string
  childName: string
  items: InvoiceItem[]
  clubName: string
  clubEmail: string
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
  const doc = new jsPDF()

  // Set up colors
  const primaryColor: [number, number, number] = [147, 51, 234] // Purple
  const secondaryColor: [number, number, number] = [107, 114, 128] // Gray

  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')

  // Club Name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.clubName, 15, 20)

  // Invoice title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('INVOICE', 15, 32)

  // Invoice Number (right aligned)
  doc.setFontSize(10)
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 195, 20, { align: 'right' })
  doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-ZA')}`, 195, 27, { align: 'right' })
  doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-ZA')}`, 195, 34, { align: 'right' })

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Bill To section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 15, 55)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.parentName, 15, 62)
  doc.text(invoice.parentEmail, 15, 68)
  doc.text(`Student: ${invoice.childName}`, 15, 74)

  // Invoice Details section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Invoice Details:', 15, 90)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
  doc.text(`Period: ${monthNames[invoice.month - 1]} ${invoice.year}`, 15, 97)

  if (invoice.paymentReference) {
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Reference (EFT):', 15, 104)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.text(invoice.paymentReference, 15, 111)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
  }

  // Line items table
  const tableStartY = invoice.paymentReference ? 125 : 115

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Quantity', 'Amount']],
    body: invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(item.amount)
    ]),
    foot: [[
      { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      {
        content: new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.total),
        styles: { fontStyle: 'bold', fillColor: primaryColor, textColor: [255, 255, 255] }
      }
    ]],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 50, halign: 'right' }
    }
  })

  // Payment Instructions
  const finalY = (doc as any).lastAutoTable.finalY + 15

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Payment Instructions:', 15, finalY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Please make payment via EFT or online payment gateway.', 15, finalY + 7)

  if (invoice.paymentReference) {
    doc.text(`When paying via EFT, please use the payment reference: ${invoice.paymentReference}`, 15, finalY + 13)
  }

  doc.text(`For queries, please contact: ${invoice.clubEmail}`, 15, finalY + 19)

  // Status badge
  const statusY = finalY + 30
  const statusColors: Record<string, [number, number, number]> = {
    PAID: [34, 197, 94],
    PENDING: [251, 191, 36],
    OVERDUE: [239, 68, 68]
  }

  const statusColor = statusColors[invoice.status] || [107, 114, 128]
  doc.setFillColor(...statusColor)
  doc.roundedRect(15, statusY, 40, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.status, 35, statusY + 6.5, { align: 'center' })

  // Footer
  doc.setTextColor(...secondaryColor)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', 105, 280, { align: 'center' })
  doc.text(`Generated on ${new Date().toLocaleDateString('en-ZA')} at ${new Date().toLocaleTimeString('en-ZA')}`, 105, 285, { align: 'center' })

  return doc
}

export const downloadInvoicePDF = (invoice: InvoiceData) => {
  const doc = generateInvoicePDF(invoice)
  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`)
}

export const viewInvoicePDF = (invoice: InvoiceData) => {
  const doc = generateInvoicePDF(invoice)
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}
