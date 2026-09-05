# SMB Invoice Generator — Step-by-Step Implementation Guide
**For: Rehmat @ Innoventix Hub**

---

## 🎯 Quick Overview
You need to build an automated invoice system with:
- ✅ Professional invoice templates
- ✅ Automatic PDF generation & email
- ✅ Client management & payment tracking
- ✅ Smart reminder automation (N8N)
- ✅ Integration with Finance Tracker (Phase 2)

---

## PHASE 1: SETUP & PLANNING (Days 1-2)

### Step 1.1: Set up Project Structure
```bash
# Create Next.js project
npx create-next-app@latest invoice-generator --typescript --tailwind

cd invoice-generator

# Install required dependencies
npm install @supabase/supabase-js
npm install puppeteer
npm install axios
npm install date-fns
npm install nodemailer
npm install react-pdf
npm install zustand  # For state management
```

### Step 1.2: Environment Variables Setup
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password

N8N_WEBHOOK_URL=your_n8n_webhook_url

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 1.3: Confirm with Ubaid (Sub-task 1)
- [ ] List all active clients
- [ ] Confirm payment schedules (Monthly/Weekly/Per Project)
- [ ] Email setup (Gmail via N8N) ✓
- [ ] Finance Tracker integration plan
- [ ] Due date policy (e.g., Net 15/30/60)

---

## PHASE 2: DATABASE SETUP (Days 3-4)

### Step 2.1: Create Supabase Tables

**Table 1: clients**
```sql
CREATE TABLE clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  payment_schedule TEXT CHECK (payment_schedule IN ('Monthly', 'Weekly', 'Per Project')),
  invoice_due_day INTEGER DEFAULT 30,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_company ON clients(company);
```

**Table 2: invoices**
```sql
CREATE TABLE invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Due Soon', 'Overdue', 'Pending Review', 'Paid')),
  due_date TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  reminder_1_sent BOOLEAN DEFAULT FALSE,
  reminder_2_sent BOOLEAN DEFAULT FALSE,
  reminder_3_sent BOOLEAN DEFAULT FALSE,
  final_reminder_sent BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP NULL,
  notes TEXT,
  line_items JSONB,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

**Table 3: invoice_reminders (for tracking)**
```sql
CREATE TABLE invoice_reminders (
  reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  reminder_type TEXT,
  sent_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'sent'
);
```

### Step 2.2: Set Up Supabase Auth
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## PHASE 3: INVOICE TEMPLATE & CALCULATIONS (Days 5-7)

### Step 3.1: Invoice HTML Template
```tsx
// components/InvoiceTemplate.tsx
import React from 'react'

interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface InvoiceTemplateProps {
  invoiceNumber: string
  date: string
  dueDate?: string
  clientName: string
  clientCompany: string
  clientEmail: string
  clientAddress: string
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  taxRate: number
  notes?: string
  paymentTerms?: string
  bankDetails?: string
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  invoiceNumber,
  date,
  dueDate,
  clientName,
  clientCompany,
  clientEmail,
  clientAddress,
  lineItems,
  subtotal,
  tax,
  total,
  taxRate,
  notes,
  paymentTerms,
  bankDetails
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-600">Innoventix Hub</h1>
          <p className="text-gray-600">Professional Solutions</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">INVOICE</p>
          <p className="text-gray-600">#{invoiceNumber}</p>
        </div>
      </div>

      {/* Date & Due Date */}
      <div className="flex justify-between mb-8 pb-8 border-b">
        <div>
          <p className="text-gray-600 text-sm">Invoice Date</p>
          <p className="font-semibold">{date}</p>
        </div>
        {dueDate && (
          <div>
            <p className="text-gray-600 text-sm">Due Date</p>
            <p className="font-semibold">{dueDate}</p>
          </div>
        )}
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-gray-600 text-sm font-bold mb-2">BILL TO:</p>
          <p className="font-semibold">{clientName}</p>
          <p className="text-gray-700">{clientCompany}</p>
          <p className="text-gray-700">{clientAddress}</p>
          <p className="text-gray-700">{clientEmail}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-bold mb-2">FROM:</p>
          <p className="font-semibold">Innoventix Hub</p>
          <p className="text-gray-700">Pakistan</p>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-blue-50 border-b-2 border-blue-600">
            <th className="text-left p-3 font-bold">Description</th>
            <th className="text-center p-3 font-bold">Qty</th>
            <th className="text-right p-3 font-bold">Rate</th>
            <th className="text-right p-3 font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, idx) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{item.description}</td>
              <td className="text-center p-3">{item.quantity}</td>
              <td className="text-right p-3">${item.rate.toFixed(2)}</td>
              <td className="text-right p-3 font-semibold">
                ${item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>Tax ({taxRate}%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 bg-blue-50 px-3 font-bold text-lg">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment & Notes */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-gray-600 text-sm font-bold mb-2">PAYMENT TERMS:</p>
          <p>{paymentTerms || 'Due upon receipt'}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-bold mb-2">BANK DETAILS:</p>
          <p>{bankDetails || 'To be provided'}</p>
        </div>
      </div>

      {notes && (
        <div className="mb-8 p-4 bg-gray-50 rounded">
          <p className="text-gray-600 text-sm font-bold mb-2">NOTES:</p>
          <p>{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-xs pt-8 border-t">
        <p>Thank you for your business!</p>
        <p>Innoventix Hub © 2026</p>
      </div>
    </div>
  )
}
```

### Step 3.2: Invoice Calculations Hook
```typescript
// hooks/useInvoiceCalculations.ts
import { useState } from 'react'

export interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoiceCalculations {
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
}

export const useInvoiceCalculations = (taxRate: number = 0) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        updated.amount = updated.quantity * updated.rate
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const tax = Number((subtotal * (taxRate / 100)).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

  return {
    lineItems,
    addLineItem,
    updateLineItem,
    removeLineItem,
    subtotal,
    tax,
    total
  }
}
```

---

## PHASE 4: DATABASE SERVICES (Days 8-9)

### Step 4.1: Client Services
```typescript
// services/clientService.ts
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
  async createClient(client: Client) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getAllClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getClientById(clientId: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateClient(clientId: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('client_id', clientId)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteClient(clientId: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('client_id', clientId)
    
    if (error) throw error
  }
}
```

### Step 4.2: Invoice Services
```typescript
// services/invoiceService.ts
import { supabase, supabaseAdmin } from '@/lib/supabase'

export interface Invoice {
  invoice_id?: string
  client_id: string
  invoice_number: string
  amount: number
  subtotal: number
  tax: number
  status: string
  due_date?: string
  sent_at?: string
  reminder_1_sent?: boolean
  reminder_2_sent?: boolean
  reminder_3_sent?: boolean
  final_reminder_sent?: boolean
  paid_at?: string
  notes?: string
  line_items: any
  currency: string
}

export const invoiceService = {
  async generateInvoiceNumber() {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!data || data.length === 0) {
      return 'INV-001'
    }
    
    const lastNumber = parseInt(data[0].invoice_number.split('-')[1])
    return `INV-${String(lastNumber + 1).padStart(3, '0')}`
  },

  async createInvoice(invoice: Invoice) {
    const invoiceNumber = await this.generateInvoiceNumber()
    
    const { data, error } = await supabase
      .from('invoices')
      .insert([{ ...invoice, invoice_number }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getAllInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getInvoiceById(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('invoice_id', invoiceId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('invoice_id', invoiceId)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async markAsPaid(invoiceId: string) {
    return this.updateInvoice(invoiceId, {
      status: 'Paid',
      paid_at: new Date().toISOString()
    })
  },

  async getInvoicesByStatus(status: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('status', status)
    
    if (error) throw error
    return data
  }
}
```

---

## PHASE 5: PDF GENERATION (Days 10-11)

### Step 5.1: PDF Generation API
```typescript
// pages/api/generate-pdf.ts
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

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

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

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`
    )
    res.send(pdf)
  } catch (error) {
    console.error('PDF Generation Error:', error)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
}
```

### Step 5.2: Email Service with PDF Attachment
```typescript
// services/emailService.ts
import nodemailer from 'nodemailer'
import axios from 'axios'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

export const emailService = {
  async generateAndSendInvoice(
    invoiceId: string,
    clientEmail: string,
    invoiceData: any,
    reminderType?: string
  ) {
    try {
      // Generate PDF
      const pdfResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/generate-pdf`,
        invoiceData,
        { responseType: 'arraybuffer' }
      )

      const emailTemplates = {
        initial: {
          subject: `Invoice ${invoiceData.invoiceNumber} from Innoventix Hub`,
          html: `
            <h2>Dear ${invoiceData.clientName},</h2>
            <p>Your invoice <strong>${invoiceData.invoiceNumber}</strong> is ready.</p>
            <p><strong>Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
            ${invoiceData.dueDate ? `<p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>` : ''}
            <p>Please find the attached invoice.</p>
            <p>Thank you for your business!</p>
            <p>Innoventix Hub</p>
          `
        },
        reminder_1: {
          subject: `Reminder: Invoice ${invoiceData.invoiceNumber} due in 8 hours`,
          html: `
            <h2>Dear ${invoiceData.clientName},</h2>
            <p>Your invoice <strong>${invoiceData.invoiceNumber}</strong> is due in 8 hours.</p>
            <p><strong>Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
            <p>Please process payment at your earliest convenience.</p>
            <p>Innoventix Hub</p>
          `
        },
        overdue: {
          subject: `OVERDUE: Invoice ${invoiceData.invoiceNumber}`,
          html: `
            <h2>Dear ${invoiceData.clientName},</h2>
            <p>Invoice <strong>${invoiceData.invoiceNumber}</strong> is now <strong>OVERDUE</strong>.</p>
            <p><strong>Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
            <p>Please remit payment immediately.</p>
            <p>Innoventix Hub</p>
          `
        },
        final: {
          subject: `FINAL REMINDER: Invoice ${invoiceData.invoiceNumber} - Overdue`,
          html: `
            <h2>Dear ${invoiceData.clientName},</h2>
            <p>This is a final reminder that invoice <strong>${invoiceData.invoiceNumber}</strong> is overdue.</p>
            <p><strong>Amount Due:</strong> $${invoiceData.total.toFixed(2)}</p>
            <p>Immediate payment is required.</p>
            <p>Innoventix Hub</p>
          `
        }
      }

      const template = emailTemplates[reminderType || 'initial']

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: clientEmail,
        subject: template.subject,
        html: template.html,
        attachments: [
          {
            filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
            content: pdfResponse.data,
            contentType: 'application/pdf'
          }
        ]
      })

      return { success: true }
    } catch (error) {
      console.error('Email send error:', error)
      throw error
    }
  }
}
```

---

## PHASE 6: FRONTEND PAGES (Days 12-15)

### Step 6.1: Invoice List Page
```tsx
// pages/invoices.tsx
'use client'

import { useEffect, useState } from 'react'
import { invoiceService } from '@/services/invoiceService'
import Link from 'next/link'

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800',
  Sent: 'bg-blue-100 text-blue-800',
  'Due Soon': 'bg-yellow-100 text-yellow-800',
  Overdue: 'bg-red-100 text-red-800',
  'Pending Review': 'bg-orange-100 text-orange-800',
  Paid: 'bg-green-100 text-green-800'
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const data = await invoiceService.getAllInvoices()
      setInvoices(data)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = filter === 'All' 
    ? invoices 
    : invoices.filter(inv => inv.status === filter)

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Invoices</h1>
        <Link 
          href="/invoices/new"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['All', 'Draft', 'Sent', 'Due Soon', 'Overdue', 'Paid'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === status 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Invoice #</th>
              <th className="px-6 py-3 text-left font-semibold">Client</th>
              <th className="px-6 py-3 text-left font-semibold">Amount</th>
              <th className="px-6 py-3 text-left font-semibold">Due Date</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.invoice_id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-semibold">
                  {invoice.invoice_number}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{invoice.clients?.name}</p>
                    <p className="text-sm text-gray-500">{invoice.clients?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold">
                  ${invoice.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {invoice.due_date 
                    ? new Date(invoice.due_date).toLocaleDateString() 
                    : '-'
                  }
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/invoices/${invoice.invoice_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No invoices found</p>
        </div>
      )}
    </div>
  )
}
```

### Step 6.2: Create Invoice Page
```tsx
// pages/invoices/new.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { invoiceService } from '@/services/invoiceService'
import { clientService } from '@/services/clientService'
import { useInvoiceCalculations } from '@/hooks/useInvoiceCalculations'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'
import { useEffect } from 'react'

export default function CreateInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  const { lineItems, addLineItem, updateLineItem, removeLineItem, subtotal, tax, total } = 
    useInvoiceCalculations(selectedClient?.tax_rate || 0)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientService.getAllClients()
      setClients(data)
    } catch (error) {
      console.error('Failed to load clients:', error)
    }
  }

  const handleCreateInvoice = async () => {
    if (!selectedClient || lineItems.length === 0) {
      alert('Please select a client and add line items')
      return
    }

    setLoading(true)
    try {
      const invoice = await invoiceService.createInvoice({
        client_id: selectedClient.client_id,
        invoice_number: '',
        subtotal,
        tax,
        amount: total,
        status: 'Draft',
        due_date: dueDate || null,
        line_items: lineItems,
        currency: 'USD',
        notes
      })

      router.push(`/invoices/${invoice.invoice_id}`)
    } catch (error) {
      console.error('Failed to create invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Create Invoice</h1>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Client</label>
              <select
                value={selectedClient?.client_id || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.client_id === e.target.value)
                  setSelectedClient(client)
                }}
                className="w-full border rounded-lg p-2"
              >
                <option value="">-- Choose a client --</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.name} ({client.company})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <button
                  onClick={addLineItem}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                      className="w-full border rounded p-2"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, { quantity: parseFloat(e.target.value) })}
                        className="border rounded p-2"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateLineItem(item.id, { rate: parseFloat(e.target.value) })}
                        className="border rounded p-2"
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">${item.amount.toFixed(2)}</span>
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes here..."
                rows={4}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Preview Invoice
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Save & Send'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-6 h-fit">
            <h3 className="text-lg font-semibold mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setShowPreview(false)}
            className="mb-6 bg-gray-600 text-white px-6 py-2 rounded-lg"
          >
            ← Back to Edit
          </button>
          <InvoiceTemplate
            invoiceNumber="INV-001"
            date={new Date().toLocaleDateString()}
            dueDate={dueDate ? new Date(dueDate).toLocaleDateString() : undefined}
            clientName={selectedClient?.name}
            clientCompany={selectedClient?.company}
            clientEmail={selectedClient?.email}
            clientAddress={selectedClient?.address}
            lineItems={lineItems}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxRate={selectedClient?.tax_rate || 0}
            notes={notes}
          />
        </div>
      )}
    </div>
  )
}
```

---

## PHASE 7: N8N AUTOMATION WORKFLOWS (Days 16-17)

### Step 7.1: N8N Workflow - Scheduled Auto Invoice
```json
{
  "name": "Scheduled Auto Invoice",
  "nodes": [
    {
      "type": "Schedule",
      "parameters": {
        "interval": "daily",
        "time": "08:00"
      }
    },
    {
      "type": "Supabase",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM clients WHERE payment_schedule = 'Monthly' AND DATE(NOW()) = DATE(invoice_due_day)"
      }
    },
    {
      "type": "HTTP Request",
      "parameters": {
        "method": "POST",
        "url": "{{$env.NEXT_PUBLIC_APP_URL}}/api/generate-invoice",
        "body": "=client_data"
      }
    },
    {
      "type": "Email",
      "parameters": {
        "to": "{{$node.Supabase.json.email}}",
        "subject": "Your Monthly Invoice",
        "message": "Your invoice is attached"
      }
    }
  ]
}
```

### Step 7.2: N8N Workflow - Payment Reminder Flow
```json
{
  "name": "Invoice Reminder Flow",
  "nodes": [
    {
      "type": "Schedule",
      "parameters": {
        "interval": "hourly"
      }
    },
    {
      "type": "Supabase",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM invoices WHERE status != 'Paid' AND due_date IS NOT NULL"
      }
    },
    {
      "type": "Conditional",
      "parameters": {
        "conditions": [
          {
            "condition": "Hours until due_date = 8",
            "action": "Send reminder_1"
          },
          {
            "condition": "due_date < NOW()",
            "action": "Send overdue reminder"
          }
        ]
      }
    },
    {
      "type": "Email",
      "parameters": {
        "subject": "Reminder: Invoice {{invoice_number}} due soon"
      }
    }
  ]
}
```

---

## PHASE 8: TESTING (Days 18-19)

### Step 8.1: Test Checklist
```
✅ Database Setup
  - [ ] All tables created successfully
  - [ ] Indexes working
  - [ ] RLS policies configured

✅ Invoice Generation
  - [ ] Create 10 test invoices
  - [ ] Verify auto-numbering (INV-001 to INV-010)
  - [ ] All calculations correct

✅ PDF Generation
  - [ ] PDF renders correctly
  - [ ] Professional formatting
  - [ ] All data populated

✅ Email System
  - [ ] Initial invoice email sends
  - [ ] PDF attached correctly
  - [ ] Template formatting looks good

✅ Automation Flows
  - [ ] Due date reminders fire correctly
  - [ ] No due date reminders work
  - [ ] Overdue notifications trigger
  - [ ] Mark as Paid stops reminders

✅ Frontend
  - [ ] Invoice list loads
  - [ ] Status filters work
  - [ ] Create invoice form functional
  - [ ] Mobile responsive

✅ N8N Integration
  - [ ] Webhooks connected
  - [ ] Workflows active
  - [ ] Error handling working
```

### Step 8.2: Test Commands
```bash
# Test email service
npm run test:email

# Test PDF generation
npm run test:pdf

# Test database
npm run test:db

# Run full test suite
npm run test
```

---

## PHASE 9: DEPLOYMENT (Days 20)

### Step 9.1: Prepare for Production
```bash
# Build Next.js app
npm run build

# Run production tests
npm run test:prod

# Check for errors
npm run lint
```

### Step 9.2: Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# GMAIL_USER
# GMAIL_APP_PASSWORD
# etc.
```

### Step 9.3: Activate N8N Workflows
- Log into N8N on Contabo VPS
- Activate all workflow nodes
- Test webhook connections
- Verify Supabase connections

---

## QUICK REFERENCE: KEY FILES TO CREATE

```
project-root/
├── lib/
│   └── supabase.ts
├── services/
│   ├── clientService.ts
│   ├── invoiceService.ts
│   └── emailService.ts
├── hooks/
│   └── useInvoiceCalculations.ts
├── components/
│   └── InvoiceTemplate.tsx
├── pages/
│   ├── invoices.tsx
│   ├── invoices/
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── clients.tsx
│   ├── clients/
│   │   └── new.tsx
│   └── api/
│       ├── generate-pdf.ts
│       └── generate-invoice.ts
└── .env.local
```

---

## 🎬 DEMO CHECKLIST FOR UBAID

When presenting:
1. **Show invoice list** — filter by status
2. **Create new invoice** — walk through form
3. **Preview invoice** — show professional template
4. **Send invoice** — email arrives in inbox with PDF
5. **Track reminder flow** — show due date logic
6. **Mark as paid** — show status change
7. **View payment history** — demo completed invoices

---

## NEXT STEPS

1. **Start with database setup** (Steps 2.1-2.2)
2. **Build invoice template** (Step 3.1)
3. **Create services** (Phase 4)
4. **Build frontend** (Phase 6)
5. **Set up automation** (Phase 7)
6. **Test thoroughly** (Phase 8)
7. **Deploy** (Phase 9)

Good luck, Rehmat! 🚀
