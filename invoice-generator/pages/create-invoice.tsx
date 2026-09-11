import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientService, Client } from '@/services/clientService'
import { invoiceService, Invoice } from '@/services/invoiceService'
import { useInvoiceCalculations } from '@/hooks/useInvoiceCalculations'
import { InvoiceTemplate } from '@/components/InvoiceTemplate'

export default function CreateInvoicePage() {
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>('')
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [loadingClients, setLoadingClients] = useState<boolean>(true)

    // Form inputs state
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState<string>('')
    const [notes, setNotes] = useState<string>('')
    const [paymentTerms, setPaymentTerms] = useState<string>('Net 30')
    const [bankDetails, setBankDetails] = useState<string>('')

    // Saved invoice reference after creation
    const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null)
    const [saving, setSaving] = useState<boolean>(false)
    const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false)
    const [sendingEmail, setSendingEmail] = useState<boolean>(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Calculate tax rate based on selected client
    const taxRate = selectedClient?.tax_rate || 0

    // Invoice calculations hook
    const {
        lineItems,
        addLineItem,
        updateLineItem,
        removeLineItem,
        subtotal,
        tax,
        total
    } = useInvoiceCalculations(taxRate)

    // Load clients on mount & add initial line item
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await clientService.getAllClients()
                setClients(data || [])
            } catch (err: any) {
                console.error('Failed to load clients:', err)
                setMessage({ type: 'error', text: err.message || 'Failed to load client list' })
            } finally {
                setLoadingClients(false)
            }
        }

        fetchClients()
        addLineItem()
    }, [])

    // Set due date default 30 days ahead when date changes or client selected
    useEffect(() => {
        if (date) {
            const dateObj = new Date(date)
            const dueDays = selectedClient?.invoice_due_day || 30
            dateObj.setDate(dateObj.getDate() + dueDays)
            setDueDate(dateObj.toISOString().split('T')[0])
        }
    }, [date, selectedClient])

    // Client selection change handler
    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value
        setSelectedClientId(clientId)
        const client = clients.find(c => c.client_id === clientId) || null
        setSelectedClient(client)
    }

    // Save Invoice to database
    const handleSaveInvoice = async (e?: React.FormEvent): Promise<Invoice | null> => {
        if (e) e.preventDefault()
        setMessage(null)

        if (!selectedClientId) {
            setMessage({ type: 'error', text: 'Please select a client before saving.' })
            return null
        }

        if (lineItems.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one line item.' })
            return null
        }

        setSaving(true)

        try {
            const invoicePayload: Invoice = {
                client_id: selectedClientId,
                invoice_number: savedInvoice?.invoice_number || 'INV-DRAFT',
                amount: total,
                subtotal: subtotal,
                tax: tax,
                status: 'Draft',
                due_date: dueDate || null,
                notes: notes,
                line_items: lineItems,
                currency: 'USD'
            }

            const created = await invoiceService.createInvoice(invoicePayload)
            setSavedInvoice(created)
            setMessage({
                type: 'success',
                text: `Invoice #${created.invoice_number} created successfully!`
            })
            return created
        } catch (err: any) {
            console.error('Failed to save invoice:', err)
            setMessage({ type: 'error', text: err.message || 'Failed to save invoice' })
            return null
        } finally {
            setSaving(false)
        }
    }

    // Download / Print PDF Action
    const handleDownloadPDF = async () => {
        setMessage(null)
        setDownloadingPdf(true)

        try {
            if (savedInvoice?.invoice_id) {
                window.open(`/invoice/${savedInvoice.invoice_id}?print=true`, '_blank')
                setMessage({ type: 'success', text: 'Opened print / PDF view in new window.' })
            } else {
                window.print()
                setMessage({ type: 'success', text: 'Opened print dialog for invoice preview.' })
            }
        } catch (err: any) {
            console.error('Print preview error:', err)
            window.print()
        } finally {
            setDownloadingPdf(false)
        }
    }

    // Send via Email Action
    const handleSendEmail = async () => {
        setMessage(null)
        setSendingEmail(true)

        try {
            let currentSavedInvoice = savedInvoice

            // Auto-save if not saved yet
            if (!currentSavedInvoice || !currentSavedInvoice.invoice_id) {
                currentSavedInvoice = await handleSaveInvoice()
                if (!currentSavedInvoice || !currentSavedInvoice.invoice_id) {
                    setSendingEmail(false)
                    return
                }
            }

            const response = await fetch('/api/send-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ invoiceId: currentSavedInvoice.invoice_id })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to send invoice email')
            }

            setMessage({
                type: 'success',
                text: `Invoice #${currentSavedInvoice.invoice_number} sent via email successfully to ${selectedClient?.email}!`
            })
        } catch (err: any) {
            console.error('Email send error:', err)
            setMessage({ type: 'error', text: err.message || 'Error sending invoice email' })
        } finally {
            setSendingEmail(false)
        }
    }

    const currentInvoiceNumber = savedInvoice?.invoice_number || 'INV-PREVIEW'

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <Link
                                href="/"
                                className="text-2xl font-bold text-blue-600 tracking-tight hover:text-blue-700 transition"
                            >
                                Innoventix Hub
                            </Link>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500 font-medium text-sm">Create Invoice</span>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href="/"
                                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/clients"
                                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                            >
                                Clients
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content split layout */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Feedback Notification Banner */}
                {message && (
                    <div
                        className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
                            message.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                    >
                        <span className="text-sm font-medium">{message.text}</span>
                        <button
                            onClick={() => setMessage(null)}
                            className="text-xs font-semibold underline ml-4"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Invoice Form Controls (5/12 cols) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Invoice Details</h2>
                            <p className="text-sm text-slate-500">Fill in details to generate live preview</p>
                        </div>

                        {/* Client Select Dropdown */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Select Client <span className="text-rose-500">*</span>
                            </label>
                            {loadingClients ? (
                                <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
                            ) : (
                                <select
                                    value={selectedClientId}
                                    onChange={handleClientChange}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                                >
                                    <option value="">-- Choose a Client --</option>
                                    {clients.map(client => (
                                        <option key={client.client_id} value={client.client_id}>
                                            {client.name} {client.company ? `(${client.company})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {!loadingClients && clients.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">
                                    No clients found.{' '}
                                    <Link href="/clients" className="underline font-semibold">
                                        Add client here
                                    </Link>
                                </p>
                            )}
                        </div>

                        {/* Date & Due Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Invoice Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Dynamic Line Items Section */}
                        <div className="pt-2 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
                                <button
                                    type="button"
                                    onClick={addLineItem}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md transition"
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {lineItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                                    >
                                        <div className="flex justify-between items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Item description..."
                                                value={item.description}
                                                onChange={e =>
                                                    updateLineItem(item.id, { description: e.target.value })
                                                }
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                                            />
                                            {lineItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLineItem(item.id)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                                    title="Remove item"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 uppercase">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e =>
                                                        updateLineItem(item.id, {
                                                            quantity: parseFloat(e.target.value) || 0
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 uppercase">Rate ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.rate}
                                                    onChange={e =>
                                                        updateLineItem(item.id, {
                                                            rate: parseFloat(e.target.value) || 0
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm text-right"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 uppercase">Amount</label>
                                                <div className="px-2 py-1 text-sm font-semibold text-slate-700 text-right">
                                                    ${item.amount.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Bank Info */}
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Payment Terms
                                </label>
                                <input
                                    type="text"
                                    value={paymentTerms}
                                    onChange={e => setPaymentTerms(e.target.value)}
                                    placeholder="e.g. Net 30, Due upon receipt"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Bank Details
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails}
                                    onChange={e => setBankDetails(e.target.value)}
                                    placeholder="Bank Name, Account #, SWIFT"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Notes / Comments
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Additional notes for the client..."
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-200 space-y-3">
                            <button
                                type="button"
                                onClick={e => handleSaveInvoice(e)}
                                disabled={saving}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition text-sm flex items-center justify-center space-x-2"
                            >
                                {saving ? (
                                    <span>Saving Invoice...</span>
                                ) : (
                                    <span>Save Invoice</span>
                                )}
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleDownloadPDF}
                                    disabled={downloadingPdf}
                                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs flex items-center justify-center space-x-1"
                                >
                                    {downloadingPdf ? (
                                        <span>Generating PDF...</span>
                                    ) : (
                                        <span>📥 Download PDF</span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendEmail}
                                    disabled={sendingEmail}
                                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-xs flex items-center justify-center space-x-1"
                                >
                                    {sendingEmail ? (
                                        <span>Sending...</span>
                                    ) : (
                                        <span>✉️ Send via Email</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Live Preview (7/12 cols) */}
                    <div className="lg:col-span-7 sticky top-20">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                Live Invoice Preview
                            </h2>
                            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                                #{currentInvoiceNumber}
                            </span>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden max-h-[85vh] overflow-y-auto">
                            <InvoiceTemplate
                                invoiceNumber={currentInvoiceNumber}
                                date={date}
                                dueDate={dueDate}
                                clientName={selectedClient?.name}
                                clientCompany={selectedClient?.company}
                                clientEmail={selectedClient?.email}
                                clientAddress={selectedClient?.address}
                                lineItems={lineItems}
                                subtotal={subtotal}
                                tax={tax}
                                total={total}
                                taxRate={taxRate}
                                notes={notes}
                                paymentTerms={paymentTerms}
                                bankDetails={bankDetails}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
