import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { invoiceService, Invoice } from '@/services/invoiceService'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'

export default function InvoicePrintPage() {
    const router = useRouter()
    const { id, print } = router.query
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id || typeof id !== 'string') return

        const fetchInvoice = async () => {
            try {
                setLoading(true)
                const data = await invoiceService.getInvoiceById(id)
                if (!data) {
                    setError('Invoice not found.')
                } else {
                    setInvoice(data)
                }
            } catch (err: any) {
                console.error('Failed to load invoice for print view:', err)
                setError(err.message || 'Failed to load invoice.')
            } finally {
                setLoading(false)
            }
        }

        fetchInvoice()
    }, [id])

    // Auto-trigger print dialog if query param print=true
    useEffect(() => {
        if (invoice && print === 'true') {
            const timer = setTimeout(() => {
                window.print()
            }, 600)
            return () => clearTimeout(timer)
        }
    }, [invoice, print])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-medium text-slate-600">Loading invoice print view...</p>
                </div>
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow border border-slate-200 text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <h1 className="text-lg font-bold text-slate-800">Unable to load invoice</h1>
                    <p className="text-sm text-slate-500">{error || 'Invoice not found.'}</p>
                    <Link
                        href="/"
                        className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-xl text-sm hover:bg-blue-700 transition"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    const client = (invoice as any).clients || {}
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
    const invoiceDate = invoice.sent_at
        ? new Date(invoice.sent_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
            {/* Top Control Bar - Hidden when printing */}
            <div className="no-print max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3">
                    <Link
                        href="/"
                        className="text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                    >
                        ← Back to Dashboard
                    </Link>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm font-bold text-slate-800">
                        Invoice #{invoice.invoice_number}
                    </span>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition flex items-center space-x-1"
                >
                    <span>🖨️ Print / Save as PDF</span>
                </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="print-area max-w-4xl mx-auto">
                <InvoiceTemplate
                    invoiceNumber={invoice.invoice_number}
                    date={invoiceDate}
                    dueDate={invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined}
                    clientName={client.name}
                    clientCompany={client.company}
                    clientEmail={client.email}
                    clientAddress={client.address}
                    lineItems={lineItems}
                    subtotal={subtotal}
                    tax={tax}
                    total={total}
                    taxRate={taxRate}
                    notes={invoice.notes}
                />
            </div>
        </div>
    )
}
