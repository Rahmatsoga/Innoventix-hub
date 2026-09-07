import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'
import { invoiceService } from '@/services/invoiceService'
import { emailService } from '@/services/emailService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { invoiceId } = req.body

        if (!invoiceId) {
            return res.status(400).json({ error: 'invoiceId is required' })
        }

        // 1. Fetch invoice and client details via invoiceService
        const invoice = await invoiceService.getInvoiceById(invoiceId)

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' })
        }

        const client = invoice.clients || {}
        const clientEmail = client.email

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is missing on the invoice' })
        }

        // Parse line items and amounts
        let lineItems = []
        if (invoice.line_items) {
            lineItems = typeof invoice.line_items === 'string'
                ? JSON.parse(invoice.line_items)
                : invoice.line_items
        }

        const subtotal = Number(invoice.subtotal || 0)
        const tax = Number(invoice.tax || 0)
        const total = Number(invoice.amount || subtotal + tax)
        const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 0
        const invoiceDate = invoice.created_at
            ? new Date(invoice.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]

        const templateProps = {
            invoiceNumber: invoice.invoice_number,
            date: invoiceDate,
            dueDate: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined,
            clientName: client.name || 'Valued Client',
            clientCompany: client.company,
            clientEmail: client.email,
            clientAddress: client.address,
            lineItems,
            subtotal,
            tax,
            total,
            taxRate,
            notes: invoice.notes
        }

        // 2. Generate HTML & PDF attachment using Puppeteer
        const htmlContent = renderToString(
            React.createElement(InvoiceTemplate, templateProps)
        )

        const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-white">
          ${htmlContent}
        </body>
      </html>
    `

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage()
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        })

        await browser.close()

        // 3. Call emailService to send email with PDF attachment
        const emailData = {
            invoiceNumber: invoice.invoice_number,
            clientName: client.name || 'Valued Client',
            clientEmail: clientEmail,
            amount: invoice.amount,
            total: total,
            dueDate: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined,
            lineItems: lineItems
        }

        const emailResult = await emailService.sendInvoiceEmail(emailData, Buffer.from(pdfBuffer))

        if (!emailResult.success) {
            return res.status(500).json({
                error: emailResult.error || 'Failed to send invoice email'
            })
        }

        // 4. Update invoice status to 'Sent' and record sent_at timestamp
        const updatedInvoice = await invoiceService.updateInvoice(invoiceId, {
            status: 'Sent',
            sent_at: new Date().toISOString()
        })

        // 5. Return JSON success response
        return res.status(200).json({
            success: true,
            message: 'Invoice sent successfully',
            invoiceId: invoiceId,
            messageId: emailResult.messageId,
            sentAt: updatedInvoice.sent_at
        })
    } catch (error) {
        console.error('Send invoice API error:', error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error while sending invoice'
        })
    }
}
