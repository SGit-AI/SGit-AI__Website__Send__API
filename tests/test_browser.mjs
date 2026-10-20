#!/usr/bin/env node
/* test_browser.mjs: the release's modules on a real page, in Chromium.
 *
 * Starts the in-memory API (releases/<release>/tests/server.mjs) and a static server for the release directory,
 * opens tests/browser.html with Playwright, and reads the checks the page ran: encrypt and decrypt, a QR code, a
 * transfer round trip, the keyring, and a vault created, written, published and read back. The pre-installed
 * Chromium (/opt/pw-browsers/chromium or CHROMIUM_PATH) is used when Playwright has none of its own.
 */
import fs from 'fs'
import http from 'http'
import path from 'path'
import { execSync } from 'child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const release = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/version.json'), 'utf8')).release
const RELEASE = path.join(ROOT, 'releases', release)
const { startServer } = await import(path.join(RELEASE, 'tests/server.mjs'))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.md': 'text/markdown' }

async function playwright() {
    try { return await import('playwright') } catch (e) {
        try { const g = execSync('npm root -g').toString().trim(); return await import(path.join(g, 'playwright', 'index.mjs')) }
        catch (e2) { console.log('SKIP: playwright is not installed'); process.exit(0) }
    }
}

const api = await startServer()
const files = http.createServer((req, res) => {
    const p = path.join(RELEASE, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (!p.startsWith(RELEASE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(fs.readFileSync(p))
})
await new Promise(r => files.listen(0, '127.0.0.1', r))
const pw = await playwright()
let browser
try { browser = await pw.chromium.launch() } catch (e) {
    try { browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' }) } catch (e2) { console.log('SKIP: chromium is not available'); process.exit(0) }
}
let failed = 0
try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(String(e)))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto(`http://127.0.0.1:${files.address().port}/tests/browser.html?endpoint=${encodeURIComponent(api.base)}&token=${encodeURIComponent(api.token)}`)
    await page.waitForSelector('body[data-done="true"]', { timeout: 60000 })
    const results = await page.evaluate(() => window.__results)
    for (const r of results) { console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.what}`); if (!r.ok) failed++ }
    if (errors.length) { console.log(`FAIL page errors: ${errors.join(' | ')}`); failed++ }
    if (results.length < 8) { console.log(`FAIL only ${results.length} checks ran`); failed++ }
} finally {
    await browser.close(); files.close(); await api.close()
}
console.log(failed ? `${failed} failure(s)` : 'browser: PASSED')
process.exit(failed ? 1 : 0)
