import nodemailer from 'nodemailer'
import axios from 'axios'

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

export interface InvoiceEmailData {
  invoiceNumber: string
  clientName: string
  clientEmail: string
  amount?: number
  total: number
  dueDate?: string
  lineItems?: any[]
}

export const emailService = {
  /**
   * Send invoice email with provided PDF buffer
   */
  async sendInvoiceEmail(
    invoiceData: InvoiceEmailData,
    pdfBuffer: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await transporter.sendMail({
        from: `"Innoventix Hub" <${process.env.GMAIL_USER}>`,
        to: invoiceData.clientEmail,
        subject: `Invoice ${invoiceData.invoiceNumber} from Innoventix Hub`,
        html: this.getInvoiceEmailTemplate(invoiceData),
        attachments: [
          {
            filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      return {
        success: true,
        messageId: result.messageId
      }
    } catch (error) {
      console.error('Email send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Generate PDF via API and send invoice email
   */
  async generateAndSendInvoice(
    invoiceId: string,
    clientEmail: string,
    invoiceData: any,
    reminderType?: 'initial' | 'reminder_1' | 'overdue' | 'final'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const pdfResponse = await axios.post(
        `${appUrl}/api/generate-pdf`,
        invoiceData,
        { responseType: 'arraybuffer' }
      )
      const pdfBuffer = Buffer.from(pdfResponse.data)

      if (reminderType === 'reminder_1') {
        return this.sendDueReminderEmail(
          { ...invoiceData, clientEmail: clientEmail },
          pdfBuffer
        )
      } else if (reminderType === 'overdue' || reminderType === 'final') {
        return this.sendOverdueEmail(
          { ...invoiceData, clientEmail: clientEmail },
          pdfBuffer
        )
      } else {
        return this.sendInvoiceEmail(
          { ...invoiceData, clientEmail: clientEmail },
          pdfBuffer
        )
      }
    } catch (error) {
      console.error('Generate and send invoice error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Send reminder email (8 hours before due)
   */
  async sendDueReminderEmail(
    invoiceData: InvoiceEmailData,
    pdfBuffer: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await transporter.sendMail({
        from: `"Innoventix Hub" <${process.env.GMAIL_USER}>`,
        to: invoiceData.clientEmail,
        subject: `⏰ Reminder: Invoice ${invoiceData.invoiceNumber} due in 8 hours`,
        html: this.getReminderEmailTemplate(invoiceData, 'reminder_1'),
        attachments: [
          {
            filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Reminder email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Send overdue email
   */
  async sendOverdueEmail(
    invoiceData: InvoiceEmailData,
    pdfBuffer: Buffer,
    reminderCount: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await transporter.sendMail({
        from: `"Innoventix Hub" <${process.env.GMAIL_USER}>`,
        to: invoiceData.clientEmail,
        subject: `🔴 OVERDUE: Invoice ${invoiceData.invoiceNumber}${reminderCount > 1 ? ` (Reminder ${reminderCount})` : ''}`,
        html: this.getReminderEmailTemplate(invoiceData, 'overdue', reminderCount),
        attachments: [
          {
            filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Overdue email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedEmail(
    invoiceData: InvoiceEmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await transporter.sendMail({
        from: `"Innoventix Hub" <${process.env.GMAIL_USER}>`,
        to: invoiceData.clientEmail,
        subject: `✅ Payment Received: Invoice ${invoiceData.invoiceNumber}`,
        html: this.getPaymentReceivedTemplate(invoiceData)
      })

      return { success: true }
    } catch (error) {
      console.error('Payment received email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Email template for initial invoice
   */
  getInvoiceEmailTemplate(data: InvoiceEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { color: #0066cc; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-weight: bold; margin-top: 5px; }
            .total { font-size: 18px; color: #0066cc; margin-top: 10px; }
            .footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">Invoice Ready!</div>

            <div class="section">
              <p>Dear ${data.clientName},</p>
              <p>Your invoice is ready. Please find it attached.</p>
            </div>

            <div class="section">
              <div class="label">Invoice Number</div>
              <div class="value">${data.invoiceNumber}</div>
              
              <div class="label" style="margin-top: 15px;">Amount Due</div>
              <div class="value total">$${Number(data.total).toFixed(2)}</div>

              ${data.dueDate ? `
                <div class="label" style="margin-top: 15px;">Due Date</div>
                <div class="value">${data.dueDate}</div>
              ` : ''}
            </div>

            <div class="section">
              <p style="margin-bottom: 0;">Thank you for your business!</p>
              <p style="margin-top: 10px; font-size: 14px;">Best regards,<br>Innoventix Hub</p>
            </div>

            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>Innoventix Hub © 2026</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  /**
   * Email template for reminders
   */
  getReminderEmailTemplate(
    data: InvoiceEmailData,
    type: 'reminder_1' | 'overdue',
    reminderCount: number = 1
  ): string {
    const isOverdue = type === 'overdue'
    const heading = isOverdue 
      ? `⚠️ Invoice ${data.invoiceNumber} is OVERDUE`
      : `⏰ Reminder: Invoice ${data.invoiceNumber} due in 8 hours`

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { color: ${isOverdue ? '#cc0000' : '#ff9900'}; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-weight: bold; margin-top: 5px; }
            .footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">${heading}</div>

            <div class="section">
              <p>Dear ${data.clientName},</p>
              <p>${isOverdue 
                ? `Invoice ${data.invoiceNumber} is now overdue and requires immediate payment.`
                : `This is a friendly reminder that invoice ${data.invoiceNumber} is due in 8 hours.`
              }</p>
            </div>

            <div class="section">
              <div class="label">Invoice Number</div>
              <div class="value">${data.invoiceNumber}</div>
              
              <div class="label" style="margin-top: 15px;">Amount Due</div>
              <div class="value" style="font-size: 18px; color: ${isOverdue ? '#cc0000' : '#ff9900'};">$${Number(data.total).toFixed(2)}</div>
            </div>

            <div class="section">
              <p>Please remit payment at your earliest convenience. Please refer to the attached invoice for payment details and bank information.</p>
            </div>

            <div class="footer">
              <p>Questions? Contact us.</p>
              <p>Innoventix Hub © 2026</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  /**
   * Email template for payment received
   */
  getPaymentReceivedTemplate(data: InvoiceEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { color: #00cc00; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-weight: bold; margin-top: 5px; }
            .footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">✅ Payment Received!</div>

            <div class="section">
              <p>Dear ${data.clientName},</p>
              <p>Thank you! We have received your payment.</p>
            </div>

            <div class="section">
              <div class="label">Invoice Number</div>
              <div class="value">${data.invoiceNumber}</div>
              
              <div class="label" style="margin-top: 15px;">Amount Paid</div>
              <div class="value" style="font-size: 18px; color: #00cc00;">$${Number(data.total).toFixed(2)}</div>
            </div>

            <div class="section">
              <p>Your account has been updated. Thank you for your prompt payment!</p>
              <p>Best regards,<br>Innoventix Hub</p>
            </div>

            <div class="footer">
              <p>Innoventix Hub © 2026</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}
