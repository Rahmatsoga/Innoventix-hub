import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { invoiceService } from '@/services/invoiceService'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    try {
        const body = req.body || {}
        const invoiceId = body.invoiceId || body.invoice_id

        if (!invoiceId) {
            return res.status(400).json({
                success: false,
                error: 'invoiceId (or invoice_id) is required'
            })
        }

        const status = body.status
        const reminderType = body.reminderType || body.reminder_type
        const reminderStatus = body.reminderStatus || body.reminder_status || 'sent'

        const reminder_1_sent = body.reminder_1_sent ?? body.reminder1Sent
        const reminder_2_sent = body.reminder_2_sent ?? body.reminder2Sent
        const reminder_3_sent = body.reminder_3_sent ?? body.reminder3Sent
        const final_reminder_sent = body.final_reminder_sent ?? body.finalReminderSent

        // Prepare invoice updates object
        const updates: Record<string, any> = {}

        if (status !== undefined && status !== null) {
            updates.status = status
            if (status === 'Paid' && !body.paid_at) {
                updates.paid_at = new Date().toISOString()
            }
            if (status === 'Sent' && !body.sent_at) {
                updates.sent_at = new Date().toISOString()
            }
        }

        if (reminder_1_sent !== undefined) updates.reminder_1_sent = Boolean(reminder_1_sent)
        if (reminder_2_sent !== undefined) updates.reminder_2_sent = Boolean(reminder_2_sent)
        if (reminder_3_sent !== undefined) updates.reminder_3_sent = Boolean(reminder_3_sent)
        if (final_reminder_sent !== undefined) updates.final_reminder_sent = Boolean(final_reminder_sent)

        // Automatically set corresponding reminder flag if reminderType is specified
        if (reminderType === 'reminder_1' && updates.reminder_1_sent === undefined) {
            updates.reminder_1_sent = true
        }
        if ((reminderType === 'reminder_2' || reminderType === 'overdue') && updates.reminder_2_sent === undefined) {
            updates.reminder_2_sent = true
        }
        if (reminderType === 'reminder_3' && updates.reminder_3_sent === undefined) {
            updates.reminder_3_sent = true
        }
        if (reminderType === 'final' && updates.final_reminder_sent === undefined) {
            updates.final_reminder_sent = true
        }

        // Execute invoice updates if any fields are present
        let updatedInvoice = null
        if (Object.keys(updates).length > 0) {
            updatedInvoice = await invoiceService.updateInvoice(invoiceId, updates)
        } else {
            updatedInvoice = await invoiceService.getInvoiceById(invoiceId)
        }

        // Record reminder event in invoice_reminders table if reminderType is supplied
        let reminderRecord = null
        if (reminderType) {
            const { data: reminderData, error: reminderError } = await supabase
                .from('invoice_reminders')
                .insert([
                    {
                        invoice_id: invoiceId,
                        reminder_type: reminderType,
                        sent_at: new Date().toISOString(),
                        status: reminderStatus
                    }
                ])
                .select()

            if (reminderError) {
                console.error('Error recording invoice reminder event:', reminderError)
            } else if (reminderData && reminderData.length > 0) {
                reminderRecord = reminderData[0]
            }
        }

        return res.status(200).json({
            success: true,
            message: 'N8N webhook processed successfully',
            invoiceId,
            updatedInvoice,
            reminderRecorded: Boolean(reminderRecord),
            reminder: reminderRecord
        })
    } catch (error) {
        console.error('N8N webhook handler error:', error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error processing N8N webhook'
        })
    }
}
