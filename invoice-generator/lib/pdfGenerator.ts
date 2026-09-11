import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface PdfInvoiceData {
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  total: number
  dueDate?: string
  lineItems?: Array<{
    description?: string
    name?: string
    quantity?: number
    qty?: number
    rate?: number
    price?: number
    unit_price?: number
    amount?: number
    total?: number
  }>
}

export async function generateInvoicePdfBuffer(invoice: PdfInvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Header background bar
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.145, 0.388, 0.922)
  })

  // Title
  page.drawText('INVOICE', {
    x: 40,
    y: height - 55,
    size: 26,
    font: fontBold,
    color: rgb(1, 1, 1)
  })

  // Company Name
  page.drawText('Innoventix Hub', {
    x: width - 160,
    y: height - 55,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1)
  })

  let y = height - 140

  // Invoice Details Box
  page.drawText(`Invoice #: ${invoice.invoiceNumber || 'INV-000'}`, {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15)
  })

  if (invoice.dueDate) {
    page.drawText(`Due Date: ${invoice.dueDate}`, {
      x: width - 200,
      y: y,
      size: 11,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4)
    })
  }

  y -= 30

  // Client Info
  page.drawText('Billed To:', {
    x: 40,
    y: y,
    size: 10,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.5)
  })
  y -= 16
  page.drawText(invoice.clientName || 'Valued Client', {
    x: 40,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  if (invoice.clientEmail) {
    y -= 14
    page.drawText(invoice.clientEmail, {
      x: 40,
      y: y,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4)
    })
  }

  y -= 40

  // Line Items Table Header
  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: width - 80,
    height: 24,
    color: rgb(0.94, 0.96, 0.99)
  })

  page.drawText('Item Description', { x: 50, y: y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Qty', { x: 330, y: y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Rate', { x: 400, y: y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
  page.drawText('Amount', { x: 480, y: y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) })

  y -= 25

  let items = invoice.lineItems || []
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch (e) { items = [] }
  }

  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      const desc = item.description || item.name || 'Service / Product'
      const qty = Number(item.quantity || item.qty || 1)
      const rate = Number(item.rate || item.unit_price || item.price || 0)
      const amount = Number(item.amount || item.total || (qty * rate) || 0)

      page.drawText(desc.substring(0, 45), { x: 50, y: y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(String(qty), { x: 330, y: y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(`$${rate.toFixed(2)}`, { x: 400, y: y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(`$${amount.toFixed(2)}`, { x: 480, y: y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })

      y -= 18

      // Horizontal separator line
      page.drawLine({
        start: { x: 40, y: y + 10 },
        end: { x: width - 40, y: y + 10 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9)
      })
    })
  }

  y -= 20

  // Total Summary Box
  page.drawRectangle({
    x: width - 240,
    y: y - 10,
    width: 200,
    height: 35,
    color: rgb(0.94, 0.96, 0.99)
  })

  page.drawText('Total Due:', {
    x: width - 230,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15)
  })

  page.drawText(`$${Number(invoice.total || 0).toFixed(2)}`, {
    x: width - 120,
    y: y,
    size: 14,
    font: fontBold,
    color: rgb(0.145, 0.388, 0.922)
  })

  // Footer
  page.drawText('Thank you for your business! - Innoventix Hub', {
    x: 40,
    y: 40,
    size: 10,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6)
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
