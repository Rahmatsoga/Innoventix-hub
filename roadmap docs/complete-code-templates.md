# Complete Code Templates - Copy & Paste Ready

---

## 1. DATABASE SETUP (Run in Supabase SQL Editor)

```sql
-- ============================================
-- TABLE 1: CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  payment_schedule TEXT DEFAULT 'Monthly' 
    CHECK (payment_schedule IN ('Monthly', 'Weekly', 'Per Project')),
  invoice_due_day INTEGER DEFAULT 30,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_company ON clients(company);

-- ============================================
-- TABLE 2: INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'Draft' 
    CHECK (status IN ('Draft', 'Sent', 'Due Soon', 'Overdue', 'Pending Review', 'Paid')),
  due_date TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  reminder_1_sent BOOLEAN DEFAULT FALSE,
  reminder_2_sent BOOLEAN DEFAULT FALSE,
  reminder_3_sent BOOLEAN DEFAULT FALSE,
  final_reminder_sent BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP NULL,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- ============================================
-- TABLE 3: INVOICE REMINDERS (Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_reminders (
  reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

CREATE INDEX idx_reminders_invoice ON invoice_reminders(invoice_id);

-- ============================================
-- Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (remove in production - add proper auth)
CREATE POLICY "allow_all_clients" ON clients FOR ALL USING (true);
CREATE POLICY "allow_all_invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "allow_all_reminders" ON invoice_reminders FOR ALL USING (true);
```

---

## 2. SUPABASE CLIENT (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Helper for server-side operations
export async function getSupabaseServerClient() {
  return supabaseAdmin
}
```

---

## 3. CLIENT SERVICE (services/clientService.ts)

```typescript
import { supabase } from '@/lib/supabase'

export interface Client {
  client_id?: string
  name: string
  company: string
  email: string
  address: string
  phone?: string
  payment_schedule: 'Monthly' | 'Weekly' | 'Per Project'
  invoice_due_day: number
  tax_rate: number
}

export const clientService = {
  /**
   * Create a new client
   */
  async createClient(client: Client): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single()

    if (error) {
      console.error('Create client error:', error)
      throw new Error(`Failed to create client: ${error.message}`)
    }

    return data
  },

  /**
   * Get all clients
   */
  async getAllClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get clients error:', error)
      throw new Error(`Failed to fetch clients: ${error.message}`)
    }

    return data || []
  },

  /**
   * Get single client by ID
   */
  async getClientById(clientId: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (error) {
      console.error('Get client error:', error)
      throw new Error(`Failed to fetch client: ${error.message}`)
    }

    return data
  },

  /**
   * Update client
   */
  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('client_id', clientId)
      .select()
      .single()

    if (error) {
      console.error('Update client error:', error)
      throw new Error(`Failed to update client: ${error.message}`)
    }

    return data
  },

  /**
   * Delete client
   */
  async deleteClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('client_id', clientId)

    if (error) {
      console.error('Delete client error:', error)
      throw new Error(`Failed to delete client: ${error.message}`)
    }
  },

  /**
   * Get clients by payment schedule
   */
  async getClientsBySchedule(schedule: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('payment_schedule', schedule)

    if (error) throw error
    return data || []
  }
}
```

---

## 4. INVOICE SERVICE (services/invoiceService.ts)

```typescript
import { supabase } from '@/lib/supabase'

export interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Invoice {
  invoice_id?: string
  client_id: string
  invoice_number?: string
  amount: number
  subtotal: number
  tax: number
  status?: string
  due_date?: string | null
  sent_at?: string | null
  reminder_1_sent?: boolean
  reminder_2_sent?: boolean
  reminder_3_sent?: boolean
  final_reminder_sent?: boolean
  paid_at?: string | null
  notes?: string
  line_items: LineItem[]
  currency?: string
}

export const invoiceService = {
  /**
   * Generate next invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return 'INV-001'
    }

    const lastNumber = parseInt(data[0].invoice_number.split('-')[1])
    const nextNumber = lastNumber + 1
    return `INV-${String(nextNumber).padStart(3, '0')}`
  },

  /**
   * Create new invoice
   */
  async createInvoice(invoice: Invoice): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber()

    const { data, error } = await supabase
      .from('invoices')
      .insert([
        {
          ...invoice,
          invoice_number: invoiceNumber,
          status: 'Draft'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Create invoice error:', error)
      throw new Error(`Failed to create invoice: ${error.message}`)
    }

    return data
  },

  /**
   * Get all invoices with client info
   */
  async getAllInvoices(): Promise<any[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(
          client_id,
          name,
          email,
          company,
          tax_rate
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get invoices error:', error)
      throw new Error(`Failed to fetch invoices: ${error.message}`)
    }

    return data || []
  },

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<any> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(*)
      `)
      .eq('invoice_id', invoiceId)
      .single()

    if (error) {
      console.error('Get invoice error:', error)
      throw new Error(`Failed to fetch invoice: ${error.message}`)
    }

    return data
  },

  /**
   * Update invoice
   */
  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('invoice_id', invoiceId)
      .select()
      .single()

    if (error) {
      console.error('Update invoice error:', error)
      throw new Error(`Failed to update invoice: ${error.message}`)
    }

    return data
  },

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string): Promise<Invoice> {
    return this.updateInvoice(invoiceId, {
      status: 'Paid',
      paid_at: new Date().toISOString(),
      reminder_1_sent: false,
      reminder_2_sent: false,
      reminder_3_sent: false,
      final_reminder_sent: false
    })
  },

  /**
   * Send invoice email
   */
  async markAsSent(invoiceId: string): Promise<Invoice> {
    return this.updateInvoice(invoiceId, {
      status: 'Sent',
      sent_at: new Date().toISOString()
    })
  },

  /**
   * Get invoices by status
   */
  async getInvoicesByStatus(status: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, company)
      `)
      .eq('status', status)

    if (error) throw error
    return data || []
  },

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(): Promise<any[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, company)
      `)
      .eq('status', 'Overdue')
      .lt('due_date', new Date().toISOString())

    if (error) throw error
    return data || []
  },

  /**
   * Get due soon invoices (within 8 hours)
   */
  async getDueSoonInvoices(): Promise<any[]> {
    const now = new Date()
    const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, company)
      `)
      .eq('status', 'Sent')
      .gt('due_date', now.toISOString())
      .lt('due_date', eightHoursLater.toISOString())

    if (error) throw error
    return data || []
  },

  /**
   * Update reminder status
   */
  async updateReminderStatus(
    invoiceId: string,
    reminderNumber: 1 | 2 | 3 | 'final'
  ): Promise<void> {
    const field = reminderNumber === 'final' ? 'final_reminder_sent' : `reminder_${reminderNumber}_sent`

    await this.updateInvoice(invoiceId, {
      [field]: true
    })
  },

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('invoice_id', invoiceId)

    if (error) throw error
  }
}
```

---

## 5. EMAIL SERVICE (services/emailService.ts)

```typescript
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
  amount: number
  total: number
  dueDate?: string
  lineItems?: any[]
}

export const emailService = {
  /**
   * Generate PDF and send invoice email
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
   * Send reminder email (8 hours before due)
   */
  async sendDueReminderEmail(
    invoiceData: InvoiceEmailData,
    pdfBuffer: Buffer
  ): Promise<{ success: boolean; messageId?: string }> {
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
      return { success: false }
    }
  },

  /**
   * Send overdue email
   */
  async sendOverdueEmail(
    invoiceData: InvoiceEmailData,
    pdfBuffer: Buffer,
    reminderCount: number = 1
  ): Promise<{ success: boolean; messageId?: string }> {
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
      return { success: false }
    }
  },

  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedEmail(invoiceData: InvoiceEmailData): Promise<{ success: boolean }> {
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
      return { success: false }
    }
  },

  /**
   * Email template for initial invoice
   */
  private getInvoiceEmailTemplate(data: InvoiceEmailData): string {
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
            .button { display: inline-block; background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
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
              <div class="value total">$${data.total.toFixed(2)}</div>

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
  private getReminderEmailTemplate(
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
              <div class="value" style="font-size: 18px; color: ${isOverdue ? '#cc0000' : '#ff9900'};">$${data.total.toFixed(2)}</div>
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
  private getPaymentReceivedTemplate(data: InvoiceEmailData): string {
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
              <div class="value" style="font-size: 18px; color: #00cc00;">$${data.total.toFixed(2)}</div>
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
```

---

## 6. INVOICE CALCULATIONS HOOK (hooks/useInvoiceCalculations.ts)

```typescript
import { useState, useCallback } from 'react'

export interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export const useInvoiceCalculations = (taxRate: number = 0) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  const addLineItem = useCallback(() => {
    const newItem: LineItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
    setLineItems(prev => [...prev, newItem])
  }, [])

  const updateLineItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        updated.amount = Number((updated.quantity * updated.rate).toFixed(2))
        return updated
      }
      return item
    }))
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearLineItems = useCallback(() => {
    setLineItems([])
  }, [])

  const subtotal = Number(
    lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
  )

  const tax = Number((subtotal * (taxRate / 100)).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

  return {
    lineItems,
    addLineItem,
    updateLineItem,
    removeLineItem,
    clearLineItems,
    subtotal,
    tax,
    total,
    taxRate
  }
}
```

---

## 7. PDF GENERATION API (pages/api/generate-pdf.ts)

```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'
import React from 'react'
import { renderToString } from 'react-dom/server'

interface GeneratePDFRequest {
  invoiceNumber: string
  date: string
  dueDate?: string
  clientName: string
  clientCompany: string
  clientEmail: string
  clientAddress: string
  lineItems: any[]
  subtotal: number
  tax: number
  total: number
  taxRate: number
  notes?: string
  paymentTerms?: string
  bankDetails?: string
}

let browser: any = null

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
  }
  return browser
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const invoiceData: GeneratePDFRequest = req.body

    // Validate required fields
    if (!invoiceData.invoiceNumber || !invoiceData.clientName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Convert React component to HTML
    const htmlContent = renderToString(
      React.createElement(InvoiceTemplate, invoiceData)
    )

    // Wrap HTML with proper styling
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
            .w-full { width: 100%; }
            .max-w-4xl { max-width: 56rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .p-8 { padding: 2rem; }
            .text-4xl { font-size: 2.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-lg { font-size: 1.125rem; }
            .text-sm { font-size: 0.875rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-blue-600 { color: #0066cc; }
            .text-gray-600 { color: #666; }
            .text-gray-700 { color: #555; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .text-right { text-align: right; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .pb-8 { padding-bottom: 2rem; }
            .border-b { border-bottom: 1px solid #ddd; }
            .border-b-2 { border-bottom: 2px solid #0066cc; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }
            table { width: 100%; border-collapse: collapse; }
            th { padding: 0.75rem; text-align: left; font-weight: bold; }
            td { padding: 0.75rem; border-bottom: 1px solid #ddd; }
            thead tr { background-color: #f0f8ff; }
            tbody tr:hover { background-color: #f9f9f9; }
            .text-center { text-align: center; }
            .bg-gray-50 { background-color: #f9f9f9; }
            .rounded { border-radius: 0.375rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .p-4 { padding: 1rem; }
            .footer { margin-top: 2rem; border-top: 1px solid #ddd; padding-top: 2rem; text-align: center; color: #999; font-size: 0.75rem; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    // Generate PDF with Puppeteer
    const browserInstance = await getBrowser()
    const page = await browserInstance.newPage()

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

    await page.close()

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`
    )
    res.send(pdf)
  } catch (error) {
    console.error('PDF Generation Error:', error)
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
```

---

## 8. INVOICE TEMPLATE COMPONENT (components/InvoiceTemplate.tsx)

```typescript
// See previous response for full template code
// This is a large React component - make sure to copy all of it
```

---

## 9. ENVIRONMENT VARIABLES (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# N8N (for Phase 1, you'll add this later)
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

---

## 10. PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "puppeteer": "^21.0.0",
    "nodemailer": "^6.9.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/next": "^9.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Quick Copy-Paste Checklist

```
✅ Copy database SQL
✅ Copy lib/supabase.ts
✅ Copy services/clientService.ts
✅ Copy services/invoiceService.ts
✅ Copy services/emailService.ts
✅ Copy hooks/useInvoiceCalculations.ts
✅ Copy pages/api/generate-pdf.ts
✅ Copy components/InvoiceTemplate.tsx
✅ Copy .env.local template
✅ Install dependencies from package.json
```

Done! Start implementing step by step.
