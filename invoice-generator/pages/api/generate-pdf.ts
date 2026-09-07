import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'
import React from 'react'
import { renderToString } from 'react-dom/server'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const invoiceData = req.body

        // Convert React component to HTML
        const htmlContent = renderToString(
            React.createElement(InvoiceTemplate, invoiceData)
        )

        // Wrap with full HTML document shell and Tailwind styles
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

        // Generate PDF with Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage()

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

        const pdf = await page.pdf({
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

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Invoice-${invoiceData.invoiceNumber || 'draft'}.pdf"`
        )
        res.send(pdf)
    } catch (error) {
        console.error('PDF Generation Error:', error)
        res.status(500).json({ error: 'Failed to generate PDF' })
    }
}