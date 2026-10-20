/* server.mjs: the SG/Send API in memory, for the tests and for local development.
 *
 * A real implementation of the routes this release speaks, in one Node process with a Map for storage: no mocks,
 * the client code runs unchanged against it. It behaves as send.sgraph.ai does on these paths, as sgit.ai's
 * api/transfers.html and api/vault-objects.html describe them and as the vault library and the sgit CLI use them:
 *
 *   transfers   create (token; a client-chosen transfer_id is accepted and refused if taken), upload (raw bytes),
 *               complete, info, download (410 once max_downloads is spent or expires_at has passed), download-base64,
 *               delete (token + the delete secret whose SHA-256 was set at create; 403 when wrong, 404 after)
 *   vault       read, write, delete, batch with compare-and-swap (a miss is {"status":"conflict"} inside a 200 and
 *               nothing after it is applied), list, public-info; presigned answers 400 as a server without S3 does
 *   health      { status: "ok" }
 *
 * CORS as measured on the real host: any origin, the sgraph headers allowed, X-API-Key refused. Keys never appear in
 * its log: it records methods, paths and statuses.
 *
 *   import { startServer } from './server.mjs'
 *   const s = await startServer({ token: 'per-run-token' })     ... s.base, s.transfers, s.vaults(), s.log ...
 *   await s.close()
 *
 *   node tests/server.mjs [port] [token]      runs it on a fixed port for a browser session
 */
import http from 'http'
import crypto from 'crypto'

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': '*' }
const ALLOWED_HEADERS = ['content-type', 'x-sgraph-access-token', 'x-sgraph-vault-write-key', 'x-sgraph-vault-enum-key', 'x-sgraph-transfer-delete-auth']
const RE_TRANSFER_ID = /^[a-z0-9]{8,32}$/i
const RE_VAULT_ID    = /^[a-z0-9]{4,24}$/

export async function startServer(opts = {}) {
    const token     = opts.token || ('local-' + crypto.randomBytes(12).toString('hex'))
    const transfers = new Map()        // id -> { meta, payload }
    const store     = new Map()        // "vid/path" -> Buffer
    const owners    = new Map()        // vid -> sha256(write key hex)
    const log       = []
    const stats     = { reads: 0, writes: 0, batches: 0, conflicts: 0, downloads: 0 }

    const body = req => new Promise((resolve, reject) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); req.on('error', reject) })
    const tokenOk = req => req.headers['x-sgraph-access-token'] === token
    const vaultAuth = (req, vid) => {
        if (!tokenOk(req)) return [401, { detail: 'access token missing or wrong' }]
        const wk = req.headers['x-sgraph-vault-write-key']
        if (!wk || !/^[0-9a-f]{64}$/.test(String(wk))) return [403, { detail: 'x-sgraph-vault-write-key missing' }]
        const h = sha256(String(wk))
        if (owners.has(vid) && owners.get(vid) !== h) return [403, { detail: 'write key does not match the one that created this vault' }]
        if (!owners.has(vid)) owners.set(vid, h)
        return null
    }

    const handler = async (req, res) => {
        const u = new URL(req.url, 'http://local')
        const m = req.method.toUpperCase()
        const done = (status, obj, extra = {}) => {
            log.push(`${m} ${u.pathname} -> ${status}`)
            if (Buffer.isBuffer(obj)) { res.writeHead(status, { 'content-type': 'application/octet-stream', ...CORS, ...extra }); res.end(obj) }
            else { res.writeHead(status, { 'content-type': 'application/json', ...CORS, ...extra }); res.end(JSON.stringify(obj)) }
        }
        try {
            if (m === 'OPTIONS') {
                const asked = String(req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
                const refused = asked.filter(h => !ALLOWED_HEADERS.includes(h))
                if (refused.length) { log.push(`OPTIONS ${u.pathname} -> 403 (${refused.join(',')} not allowed)`); res.writeHead(403, CORS); res.end(); return }
                res.writeHead(204, { ...CORS, 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': ALLOWED_HEADERS.join(', '), 'access-control-max-age': '600' }); res.end(); return
            }
            const parts = u.pathname.split('/').filter(Boolean)
            if (parts[0] !== 'api') return done(404, { detail: 'not found' })
            if (parts[1] === 'health' && m === 'GET') return done(200, { status: 'ok', version: 'in-memory', time: new Date().toISOString() })
            if (parts[1] === 'transfers') return transfer(parts[2], parts[3])
            if (parts[1] === 'vault')     return vault(parts[2], parts[3], parts.slice(4).map(p => decodeURIComponent(p)).join('/'))
            if (parts[1] === 'presigned' && parts[2] === 'capabilities') return done(200, { direct: true, presigned: false, multipart: false })
            return done(404, { detail: 'not found' })
        } catch (e) {
            return done(500, { detail: String(e && e.message || e) })
        }

        async function transfer(verb, id) {
            if (verb === 'create' && m === 'POST') {
                if (!tokenOk(req)) return done(401, { detail: 'access token required' })
                let b; try { b = JSON.parse((await body(req)).toString('utf8') || '{}') } catch (e) { return done(400, { detail: 'bad json' }) }
                let tid = b.transfer_id
                if (tid !== undefined && tid !== null && tid !== '') {
                    if (!RE_TRANSFER_ID.test(String(tid))) return done(400, { detail: 'invalid_transfer_id_format' })
                    if (transfers.has(tid)) return done(409, { detail: 'transfer_id_exists' })
                } else tid = crypto.randomBytes(9).toString('base64url').replace(/[^a-z0-9]/gi, 'x').slice(0, 12).toLowerCase()
                const meta = { transfer_id: tid, status: 'created', file_size_bytes: Number(b.file_size_bytes) || 0, content_type_hint: String(b.content_type_hint || 'application/octet-stream'),
                               max_downloads: Number(b.max_downloads) || 0, auto_delete: b.auto_delete !== false, expires_at: Number(b.expires_at) || 0,
                               delete_auth_hash: typeof b.delete_auth_hash === 'string' && /^[0-9a-f]{64}$/.test(b.delete_auth_hash) ? b.delete_auth_hash : null,
                               created_at: Date.now(), download_count: 0, encrypted_size: 0 }
                transfers.set(tid, { meta, payload: null })
                return done(200, { transfer_id: tid, upload_url: `/api/transfers/upload/${tid}`, expires_at: meta.expires_at })
            }
            const t = id && transfers.get(id)
            if (verb === 'upload' && m === 'POST') {
                if (!tokenOk(req)) return done(401, { detail: 'access token required' })
                if (!t) return done(404, { detail: 'transfer not found' })
                const p = await body(req)
                if (p.length > 6 * 1024 * 1024) return done(413, { detail: 'payload too large' })
                t.payload = p; t.meta.encrypted_size = p.length; t.meta.status = 'uploaded'; stats.writes++
                return done(200, { transfer_id: id, status: 'uploaded', size: p.length })
            }
            if (verb === 'complete' && m === 'POST') {
                if (!tokenOk(req)) return done(401, { detail: 'access token required' })
                if (!t) return done(404, { detail: 'transfer not found' })
                if (!t.payload) return done(400, { detail: 'nothing uploaded' })
                t.meta.status = 'ready'
                return done(200, { transfer_id: id, status: 'ready', download_url: `/d/${id}` })
            }
            if (verb === 'info' && m === 'GET') {
                if (!t) return done(404, { detail: 'transfer not found' })
                const { delete_auth_hash, ...pub } = t.meta
                return done(200, { ...pub, revocable: !!delete_auth_hash })
            }
            if ((verb === 'download' || verb === 'download-base64') && m === 'GET') {
                if (!t) return done(404, { detail: 'transfer not found' })
                if (t.meta.status !== 'ready') return done(404, { detail: 'transfer not ready' })
                if (t.meta.expires_at && Date.now() > t.meta.expires_at) return done(410, { detail: 'expired' })
                if (t.meta.max_downloads && t.meta.download_count >= t.meta.max_downloads) return done(410, { detail: 'download limit reached' })
                t.meta.download_count++; stats.downloads++
                if (verb === 'download') return done(200, t.payload)
                return done(200, { transfer_id: id, size: t.payload.length, content_base64: t.payload.toString('base64') })
            }
            if (verb === 'delete' && m === 'DELETE') {
                if (!tokenOk(req)) return done(401, { detail: 'access token required' })
                if (!t) return done(404, { detail: 'transfer not found' })
                if (!t.meta.delete_auth_hash) return done(403, { detail: 'deletion was not enabled for this transfer' })
                const secret = String(req.headers['x-sgraph-transfer-delete-auth'] || '')
                if (sha256(secret) !== t.meta.delete_auth_hash) return done(403, { detail: 'delete auth does not match' })
                transfers.delete(id)
                return done(200, { transfer_id: id, deleted: true })
            }
            return done(404, { detail: 'not found' })
        }

        async function vault(verb, vid, path) {
            if (!RE_VAULT_ID.test(vid || '')) return done(400, { detail: 'bad vault id' })
            if (verb === 'read' && m === 'GET') {
                stats.reads++
                const b = store.get(`${vid}/${path}`)
                return b ? done(200, b, { 'cache-control': path.includes('-imm-') ? 'public, max-age=31536000, immutable' : 'no-store' }) : done(404, { detail: 'not found' })
            }
            if (verb === 'write' && m === 'PUT') {
                const bad = vaultAuth(req, vid); if (bad) return done(...bad)
                store.set(`${vid}/${path}`, await body(req)); stats.writes++
                return done(200, { status: 'ok', file_id: path })
            }
            if (verb === 'delete' && m === 'DELETE') {
                const bad = vaultAuth(req, vid); if (bad) return done(...bad)
                return done(200, { status: 'ok', deleted: store.delete(`${vid}/${path}`) })
            }
            if (verb === 'batch' && m === 'POST') {
                stats.batches++
                let ops; try { ops = JSON.parse((await body(req)).toString('utf8')).operations || [] } catch (e) { return done(400, { detail: 'bad json' }) }
                if (ops.some(o => o.op !== 'read')) { const bad = vaultAuth(req, vid); if (bad) return done(...bad) }
                const results = []
                for (const o of ops) {
                    const key = `${vid}/${o.file_id}`
                    if (o.op === 'read') { const b = store.get(key); results.push(b ? { status: 'ok', file_id: o.file_id, data: b.toString('base64') } : { status: 'not_found', file_id: o.file_id }) }
                    else if (o.op === 'delete') { store.delete(key); results.push({ status: 'ok', file_id: o.file_id }) }
                    else if (o.op === 'write-if-match') {
                        const current = store.get(key) || null, expected = o.match ? Buffer.from(o.match, 'base64') : null
                        const same = (current === null && expected === null) || (current && expected && current.equals(expected))
                        if (!same) { stats.conflicts++; results.push({ status: 'conflict', file_id: o.file_id, current: current ? current.toString('base64') : null, message: `CAS mismatch on ${o.file_id}` }); return done(200, { status: 'conflict', results }) }
                        store.set(key, Buffer.from(o.data, 'base64')); stats.writes++; results.push({ status: 'ok', file_id: o.file_id })
                    } else { store.set(key, Buffer.from(o.data, 'base64')); stats.writes++; results.push({ status: 'ok', file_id: o.file_id }) }
                }
                return done(200, { status: 'ok', results })
            }
            if (verb === 'list' && m === 'GET') {
                const prefix = u.searchParams.get('prefix') || ''
                const files = [...store.keys()].filter(k => k.startsWith(`${vid}/${prefix}`)).map(k => k.slice(vid.length + 1))
                return done(200, { files, count: files.length })
            }
            if (verb === 'presigned') return done(400, { detail: 'presigned URLs are not available on this server' })
            if ((verb === 'public-info' || verb === 'health') && m === 'GET') {
                const n = [...store.keys()].filter(k => k.startsWith(`${vid}/`)).length
                return n ? done(200, { vault_id: vid, files: n }) : done(404, { detail: 'vault not found' })
            }
            return done(404, { detail: 'not found' })
        }
    }

    const server = http.createServer(handler)
    await new Promise(r => server.listen(opts.port || 0, '127.0.0.1', r))
    const port = server.address().port
    return {
        token, transfers, store, owners, log, stats, port, server,
        base: `http://127.0.0.1:${port}`, baseLocalhost: `http://localhost:${port}`,
        vaults: () => [...new Set([...store.keys()].map(k => k.split('/')[0]))],
        files: vid => [...store.keys()].filter(k => k.startsWith(vid + '/')).map(k => k.slice(vid.length + 1)),
        close: () => new Promise(r => server.close(r)),
    }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    const s = await startServer({ port: Number(process.argv[2]) || 8787, token: process.argv[3] || 'local-dev-token' })
    console.log(`in-memory SG/Send API at ${s.baseLocalhost}  (access token: ${s.token})`)
}
