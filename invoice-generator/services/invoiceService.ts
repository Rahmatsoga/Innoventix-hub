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
    async generateInvoiceNumber(): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('invoice_number')

            if (error || !data || data.length === 0) {
                return `INV-${Math.floor(1000 + Math.random() * 9000)}`
            }

            const existingNumbers = new Set(data.map(d => d.invoice_number).filter(Boolean))

            let maxNumber = 0
            for (const item of data) {
                if (!item.invoice_number) continue
                const matches = item.invoice_number.match(/\d+/)
                if (matches) {
                    const num = parseInt(matches[0], 10)
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num
                    }
                }
            }

            let nextNum = maxNumber > 0 ? maxNumber + 1 : Math.floor(1000 + Math.random() * 9000)
            let candidate = `INV-${String(nextNum).padStart(4, '0')}`

            while (existingNumbers.has(candidate)) {
                nextNum++
                candidate = `INV-${String(nextNum).padStart(4, '0')}`
                if (nextNum > maxNumber + 100) {
                    candidate = `INV-${Date.now().toString().slice(-6)}`
                    break
                }
            }

            return candidate
        } catch (err) {
            console.error('Error generating invoice number:', err)
            return `INV-${Date.now().toString().slice(-6)}`
        }
    },

    async createInvoice(invoice: Invoice) {
        // If invoice_number is missing, invalid, NaN, or placeholder, generate a robust collision-free number
        if (
            !invoice.invoice_number ||
            invoice.invoice_number.includes('DRAFT') ||
            invoice.invoice_number.includes('NaN') ||
            invoice.invoice_number.includes('PREVIEW')
        ) {
            invoice.invoice_number = await this.generateInvoiceNumber()
        }

        const { data, error } = await supabase
            .from('invoices')
            .insert([invoice])
            .select()

        if (error) {
            // Automatic retry on unique constraint collision
            if (error.code === '23505' || error.message?.includes('unique constraint')) {
                invoice.invoice_number = `INV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`
                const retry = await supabase
                    .from('invoices')
                    .insert([invoice])
                    .select()

                if (retry.error) throw retry.error
                return retry.data[0]
            }
            throw error
        }

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