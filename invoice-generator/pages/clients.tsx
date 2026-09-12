import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientService, Client } from '@/services/clientService'

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [submitting, setSubmitting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    // Form state
    const [formData, setFormData] = useState<Omit<Client, 'client_id'>>({
        name: '',
        company: '',
        email: '',
        address: '',
        phone: '',
        payment_schedule: 'Monthly',
        invoice_due_day: 30,
        tax_rate: 0
    })

    const fetchClients = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await clientService.getAllClients()
            setClients(data || [])
        } catch (err: any) {
            console.error('Failed to fetch clients:', err)
            setError(err.message || 'Failed to load clients')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchClients()
    }, [])

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Client name and email are required.')
            return
        }

        setSubmitting(true)
        setError(null)

        try {
            await clientService.createClient(formData)
            // Reset form & close modal
            setFormData({
                name: '',
                company: '',
                email: '',
                address: '',
                phone: '',
                payment_schedule: 'Monthly',
                invoice_due_day: 30,
                tax_rate: 0
            })
            setIsModalOpen(false)
            fetchClients()
        } catch (err: any) {
            console.error('Failed to create client:', err)
            setError(err.message || 'Failed to save client')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (clientId: string) => {
        if (!confirm('Are you sure you want to delete this client?')) return
        try {
            await clientService.deleteClient(clientId)
            setClients(prev => prev.filter(c => c.client_id !== clientId))
        } catch (err: any) {
            console.error('Failed to delete client:', err)
            alert(err.message || 'Failed to delete client')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                IH
                            </div>
                            <span className="font-bold text-xl text-slate-900 tracking-tight">
                                Innoventix Hub
                            </span>
                        </div>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <Link
                                href="/"
                                className="text-slate-600 hover:text-blue-600 transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/clients"
                                className="text-blue-600 font-semibold border-b-2 border-blue-600 py-5"
                            >
                                Clients
                            </Link>
                            <Link
                                href="/create-invoice"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                            >
                                + Create Invoice
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                            Client Directory
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage client details, billing schedules, and tax configurations.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Add New Client
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex justify-between items-center text-sm">
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-800 font-bold"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-medium">Loading clients...</p>
                    </div>
                ) : clients.length === 0 ? (
                    /* Empty State */
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                            👤
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">No Clients Registered</h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                            Start adding clients to streamline invoice generation and payment reminder workflows.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                        >
                            + Add First Client
                        </button>
                    </div>
                ) : (
                    /* Clients Table */
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-6">Client / Company</th>
                                        <th className="py-4 px-6">Contact Info</th>
                                        <th className="py-4 px-6">Schedule</th>
                                        <th className="py-4 px-6">Due Terms</th>
                                        <th className="py-4 px-6">Tax Rate</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {clients.map(client => (
                                        <tr
                                            key={client.client_id}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="font-semibold text-slate-900">
                                                    {client.name}
                                                </div>
                                                {client.company && (
                                                    <div className="text-xs text-slate-500">
                                                        {client.company}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-slate-800">{client.email}</div>
                                                {client.phone && (
                                                    <div className="text-xs text-slate-500">
                                                        {client.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        client.payment_schedule === 'Monthly'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : client.payment_schedule === 'Weekly'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}
                                                >
                                                    {client.payment_schedule}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 font-medium">
                                                {client.invoice_due_day} Days
                                            </td>
                                             <td className="py-4 px-6 text-slate-600 font-medium">
                                                 {parseFloat(Number(client.tax_rate || 0).toFixed(2))}%
                                             </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => client.client_id && handleDelete(client.client_id)}
                                                    className="text-slate-400 hover:text-red-600 font-medium transition-colors text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Add Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all border border-slate-100">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Add New Client</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. John Doe"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="client@example.com"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+1 555 0192"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Billing Address
                                </label>
                                <textarea
                                    name="address"
                                    rows={2}
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Full street address..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Schedule
                                    </label>
                                    <select
                                        name="payment_schedule"
                                        value={formData.payment_schedule}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Per Project">Per Project</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Due Days
                                    </label>
                                    <input
                                        type="number"
                                        name="invoice_due_day"
                                        value={formData.invoice_due_day}
                                        onChange={handleInputChange}
                                        min={1}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Tax Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="tax_rate"
                                        value={formData.tax_rate}
                                        onChange={handleInputChange}
                                        min={0}
                                        step={0.1}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Client'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
