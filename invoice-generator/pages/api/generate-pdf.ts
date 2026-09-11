import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return res.status(200).json({
        success: true,
        message: 'PDF generation is handled via dedicated client-side print view (/invoice/[id]?print=true).'
    })
}