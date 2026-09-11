import puppeteerCore from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function getPuppeteerBrowser() {
    // Determine if running in a Serverless environment (Netlify, AWS Lambda, Vercel)
    const isServerless =
        !!process.env.NETLIFY ||
        !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
        !!process.env.VERCEL ||
        process.env.NODE_ENV === 'production'

    if (isServerless) {
        const executablePath = await chromium.executablePath()
        return await puppeteerCore.launch({
            args: chromium.args,
            executablePath: executablePath,
            headless: true,
        })
    }

    // Local development environment fallback
    try {
        const puppeteer = (await import('puppeteer')).default
        return await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
    } catch {
        const executablePath = await chromium.executablePath()
        return await puppeteerCore.launch({
            args: chromium.args,
            executablePath: executablePath,
            headless: true,
        })
    }
}
