import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as qr from '../send/send-qr.js'

test('a share link renders as an SVG with one path and the link as its title', () => {
    const svg = qr.toSvg('https://send.sgit.ai/open/#abc123def456/' + 'A'.repeat(43), { title: 'the link' })
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'))
    assert.ok(svg.includes('<title>the link</title>'))
    assert.ok(/<path d="M[0-9 ]+h1v1h-1z/.test(svg))
    assert.ok(svg.includes('fill="currentColor"'))
})

test('the module grid is square, odd-sized and has the three finder patterns', () => {
    const m = qr.modules('river-cloud-3847')
    assert.ok(m.size >= 21 && m.size % 4 === 1)
    assert.ok(m.dark(0, 0) && m.dark(0, m.size - 1) && m.dark(m.size - 1, 0))
})

test('fits() says what a code can carry, and a data URL is built with black on white', () => {
    assert.ok(qr.fits('x'.repeat(2000), 'L'))
    assert.ok(!qr.fits('x'.repeat(3000), 'L'))
    assert.ok(qr.toDataUrl('hi').startsWith('data:image/svg+xml;charset=utf-8,%3Csvg'))
})

test('a title is escaped so vault text cannot break out of the SVG', () => {
    const svg = qr.toSvg('x', { title: '<script>alert(1)</script>' })
    assert.ok(!svg.includes('<script>'))
})
