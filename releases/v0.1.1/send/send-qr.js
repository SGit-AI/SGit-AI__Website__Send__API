/* send-qr.js, api.send.sgit.ai v0.1.1
 *
 * A share link as a QR code, drawn as SVG in the browser from the vendored qrcode-generator 2.0.4 (Kazuhiko Arase,
 * MIT). Nothing is fetched and nothing leaves the page: the SVG is a string the caller puts in the DOM or saves.
 * The colours default to currentColor on a transparent background so the code takes the page's theme; a printed
 * code should pass explicit dark and light values.
 */
import { qrcode } from '../vendor/qrcode-generator/2.0.4/qrcode.mjs'

export const MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 }                 // version 40, byte mode, per error-correction level

export function fits(text, ecc = 'M') {
    return new TextEncoder().encode(String(text)).length <= MAX_BYTES[ecc]
}

/** The modules of a code: { size, dark(row, col) }. typeNumber 0 picks the smallest version that fits. */
export function modules(text, { ecc = 'M' } = {}) {
    const qr = qrcode(0, ecc)
    qr.addData(String(text), 'Byte')
    qr.make()
    const size = qr.getModuleCount()
    return { size, dark: (r, c) => qr.isDark(r, c) }
}

/** An SVG string: one path for every dark module, crisp at any size, with the link as the title for a screen reader. */
export function toSvg(text, { ecc = 'M', margin = 2, size = 192, dark = 'currentColor', light = 'none', title = '' } = {}) {
    const m = modules(text, { ecc })
    const n = m.size + margin * 2
    let d = ''
    for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++) if (m.dark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`
    const t = title ? `<title>${escapeXml(title)}</title>` : ''
    const bg = light === 'none' ? '' : `<rect width="${n}" height="${n}" fill="${escapeXml(light)}"/>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR code">${t}${bg}<path d="${d}" fill="${escapeXml(dark)}"/></svg>`
}

/** The same SVG as a data: URL, for an <img src> or a download link. */
export function toDataUrl(text, opts = {}) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(toSvg(text, { dark: '#000', light: '#fff', ...opts }))
}

function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}
