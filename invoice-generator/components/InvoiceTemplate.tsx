import React from 'react'

export interface LineItem {
    id: string
    description: string
    quantity: number
    rate: number
    amount: number
}

export interface InvoiceTemplateProps {
    invoiceNumber: string
    date: string
    dueDate?: string
    clientName?: string
    clientCompany?: string
    clientEmail?: string
    clientAddress?: string
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
        <div className="w-full max-w-4xl mx-auto p-8 bg-white text-gray-900 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-blue-600">Innoventix Hub</h1>
                    <p className="text-gray-600">Professional Solutions</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold">INVOICE</p>
                    <p className="text-gray-600 font-mono">#{invoiceNumber}</p>
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
                    <p className="font-semibold">{clientName || 'Valued Client'}</p>
                    {clientCompany && <p className="text-gray-700">{clientCompany}</p>}
                    {clientAddress && <p className="text-gray-700">{clientAddress}</p>}
                    {clientEmail && <p className="text-gray-700">{clientEmail}</p>}
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
                    <tr className="bg-blue-50 border-b-2 border-blue-600 text-gray-800">
                        <th className="text-left p-3 font-bold">Description</th>
                        <th className="text-center p-3 font-bold">Qty</th>
                        <th className="text-right p-3 font-bold">Rate</th>
                        <th className="text-right p-3 font-bold">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {lineItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{item.description || 'Item'}</td>
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
                        <span>Tax ({parseFloat(Number(taxRate || 0).toFixed(2))}%):</span>
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
                    <p className="text-gray-800">{notes}</p>
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