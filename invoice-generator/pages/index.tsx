import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { invoiceService, Invoice } from '@/services/invoiceService'

export default function DashboardPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const data = await invoiceService.getAllInvoices()
            setInvoices(data || [])
        } catch (err: any) {
            console.error('Failed to load invoices:', err)
            setMessage({ type: 'error', text: err.message || 'Failed to fetch invoices' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    // Metrics Calculations
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    const totalPaid = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    const totalOverdue = invoices
        .filter(inv => {
            if (inv.status === 'Paid') return false
            if (!inv.due_date) return false
            const dueDate = new Date(inv.due_date)
            return dueDate < today
        })
        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    const totalDueSoon = invoices
        .filter(inv => {
            if (inv.status === 'Paid') return false
            if (!inv.due_date) return false
            const dueDate = new Date(inv.due_date)
            return dueDate >= today && dueDate <= sevenDaysFromNow
        })
        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    // Status Badge Helper
    const getStatusInfo = (inv: Invoice) => {
        if (inv.status === 'Paid') {
            return { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        }
        if (inv.due_date) {
            const dueDate = new Date(inv.due_date)
            if (dueDate < today) {
                return { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200' }
            }
            if (dueDate <= sevenDaysFromNow) {
                return { label: 'Due Soon', color: 'bg-amber-50 text-amber-700 border-amber-200' }
            }
        }
        if (inv.status === 'Sent') {
            return { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200' }
        }
        return { label: inv.status || 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }

    // Row Action: Mark as Paid
    const handleMarkAsPaid = async (invoiceId: string) => {
        setActionLoading(prev => ({ ...prev, [invoiceId]: 'paying' }))
        setMessage(null)
        try {
            await invoiceService.markAsPaid(invoiceId)
            setMessage({ type: 'success', text: 'Invoice marked as Paid successfully!' })
            fetchInvoices()
        } catch (err: any) {
            console.error('Error marking as paid:', err)
            setMessage({ type: 'error', text: err.message || 'Failed to mark invoice as paid' })
        } finally {
            setActionLoading(prev => ({ ...prev, [invoiceId]: null }))
        }
    }

    // Row Action: Download PDF
    const handleDownloadPDF = (inv: Invoice) => {
        if (!inv.invoice_id) return
        window.open(`/invoice/${inv.invoice_id}?print=true`, '_blank')
    }

    // Row Action: Send Email
    const handleSendEmail = async (invoiceId: string, invoiceNumber: string) => {
        setActionLoading(prev => ({ ...prev, [invoiceId]: 'email' }))
        setMessage(null)

        try {
            const response = await fetch('/api/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to send invoice email')
            }

            setMessage({ type: 'success', text: `Invoice #${invoiceNumber} sent via email!` })
            fetchInvoices()
        } catch (err: any) {
            console.error('Error sending email:', err)
            setMessage({ type: 'error', text: err.message || 'Failed to send invoice email' })
        } finally {
            setActionLoading(prev => ({ ...prev, [invoiceId]: null }))
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
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
                            <span className="text-slate-500 font-medium text-sm">Dashboard</span>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href="/clients"
                                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                            >
                                Clients
                            </Link>
                            <Link
                                href="/create-invoice"
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                            >
                                + Create Invoice
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Feedback Notification Banner */}
                {message && (
                    <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${
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

                {/* Dashboard Hero Banner (Title & Subtitle Only) */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
                    <h1 className="text-3xl font-extrabold tracking-tight">Invoice Dashboard</h1>
                    <p className="text-blue-100 mt-1 text-sm">
                        Manage invoices, track payments, and send billing emails to clients.
                    </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Total Invoiced */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Total Invoiced
                        </p>
                        <p className="text-3xl font-extrabold text-slate-900">
                            ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">{invoices.length} total invoices</p>
                    </div>

                    {/* Paid */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                            Paid
                        </p>
                        <p className="text-3xl font-extrabold text-emerald-600">
                            ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">
                            {invoices.filter(i => i.status === 'Paid').length} invoices paid
                        </p>
                    </div>

                    {/* Overdue */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                            Overdue
                        </p>
                        <p className="text-3xl font-extrabold text-rose-600">
                            ${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">Requires attention</p>
                    </div>

                    {/* Due Soon */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                            Due Soon (7 Days)
                        </p>
                        <p className="text-3xl font-extrabold text-amber-600">
                            ${totalDueSoon.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">Upcoming payments</p>
                    </div>
                </div>

                {/* Recent Invoices Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Recent Invoices</h2>
                            <p className="text-xs text-slate-500">All generated invoices and status updates</p>
                        </div>
                        <button
                            onClick={fetchInvoices}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                        >
                            🔄 Refresh List
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
                            <p className="text-sm">Loading invoices...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 space-y-4">
                            <p className="text-base font-medium">No invoices created yet.</p>
                            <Link
                                href="/create-invoice"
                                className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition"
                            >
                                + Create Your First Invoice
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3.5">Invoice #</th>
                                        <th className="px-6 py-3.5">Client</th>
                                        <th className="px-6 py-3.5">Due Date</th>
                                        <th className="px-6 py-3.5 text-right">Amount</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.map((inv) => {
                                        const client = (inv as any).clients || {}
                                        const statusInfo = getStatusInfo(inv)
                                        const invId = inv.invoice_id || ''
                                        const currentAction = actionLoading[invId]

                                        return (
                                            <tr key={invId} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900">
                                                    #{inv.invoice_number}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800">
                                                        {client.name || 'Valued Client'}
                                                    </div>
                                                    {client.company && (
                                                        <div className="text-xs text-slate-400">
                                                            {client.company}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                    {inv.due_date
                                                        ? new Date(inv.due_date).toLocaleDateString('en-US', {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              year: 'numeric'
                                                          })
                                                        : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                                    ${Number(inv.amount).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${statusInfo.color}`}
                                                    >
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {inv.status !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(invId)}
                                                                disabled={currentAction === 'paying'}
                                                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50"
                                                                title="Mark as Paid"
                                                            >
                                                                {currentAction === 'paying' ? '...' : '✓ Mark Paid'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDownloadPDF(inv)}
                                                            disabled={currentAction === 'pdf'}
                                                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition disabled:opacity-50"
                                                            title="Download PDF"
                                                        >
                                                            {currentAction === 'pdf' ? '...' : '📥 PDF'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendEmail(invId, inv.invoice_number)}
                                                            disabled={currentAction === 'email'}
                                                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition disabled:opacity-50"
                                                            title="Send via Email"
                                                        >
                                                            {currentAction === 'email' ? '...' : '✉️ Email'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
