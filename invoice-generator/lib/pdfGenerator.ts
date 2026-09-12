import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface PdfInvoiceData {
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  subtotal?: number
  tax?: number
  taxRate?: number
  tax_rate?: number
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

  let calculatedSubtotal = 0

  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item) => {
      const desc = item.description || item.name || 'Service / Product'
      const qty = Number(item.quantity || item.qty || 1)
      const rate = Number(item.rate || item.unit_price || item.price || 0)
      const amount = Number(item.amount || item.total || (qty * rate) || 0)
      calculatedSubtotal += amount

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

  // Financial summary calculations
  const subtotal = Number(invoice.subtotal !== undefined ? invoice.subtotal : calculatedSubtotal)
  const total = Number(invoice.total || subtotal)
  const tax = Number(invoice.tax !== undefined ? invoice.tax : (total > subtotal ? total - subtotal : 0))

  const rawTaxRate = (invoice.taxRate !== undefined)
    ? Number(invoice.taxRate)
    : (invoice.tax_rate !== undefined)
      ? Number(invoice.tax_rate)
      : (subtotal > 0 && tax > 0 ? (tax / subtotal) * 100 : 0)

  const formattedTaxRate = parseFloat(Number(rawTaxRate).toFixed(2))

  y -= 15

  const rightMarginX = width - 50
  const summaryBoxWidth = 220
  const summaryBoxX = width - 40 - summaryBoxWidth

  // 1. Subtotal Row
  const subtotalStr = `$${subtotal.toFixed(2)}`
  const subtotalWidth = fontRegular.widthOfTextAtSize(subtotalStr, 10)
  page.drawText('Subtotal:', {
    x: summaryBoxX + 10,
    y: y,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3)
  })
  page.drawText(subtotalStr, {
    x: rightMarginX - subtotalWidth,
    y: y,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  })

  y -= 18

  // 2. Tax Row
  const taxLabelStr = `Tax (${formattedTaxRate}%):`
  const taxStr = `$${tax.toFixed(2)}`
  const taxWidth = fontRegular.widthOfTextAtSize(taxStr, 10)
  page.drawText(taxLabelStr, {
    x: summaryBoxX + 10,
    y: y,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3)
  })
  page.drawText(taxStr, {
    x: rightMarginX - taxWidth,
    y: y,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  })

  y -= 25

  // 3. Total Due Row (Highlight Box)
  page.drawRectangle({
    x: summaryBoxX,
    y: y - 8,
    width: summaryBoxWidth,
    height: 32,
    color: rgb(0.94, 0.96, 0.99)
  })

  const totalStr = `$${total.toFixed(2)}`
  const totalWidth = fontBold.widthOfTextAtSize(totalStr, 13)

  page.drawText('Total Due:', {
    x: summaryBoxX + 10,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15)
  })

  page.drawText(totalStr, {
    x: rightMarginX - totalWidth,
    y: y,
    size: 13,
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
