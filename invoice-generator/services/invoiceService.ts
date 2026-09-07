import { supabase } from '@/lib/supabase'

export interface Invoice {
    invoice_id?: string
    client_id: string
    invoice_number: string
    amount: number
    subtotal: number
    tax: number
    status: string
    due_date?: string | null
    sent_at?: string | null
    reminder_1_sent?: boolean
    reminder_2_sent?: boolean
    reminder_3_sent?: boolean
    final_reminder_sent?: boolean
    paid_at?: string | null
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
            .insert([{ ...invoice, invoice_number: invoiceNumber }])
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