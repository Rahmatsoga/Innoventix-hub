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