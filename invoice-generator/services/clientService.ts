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