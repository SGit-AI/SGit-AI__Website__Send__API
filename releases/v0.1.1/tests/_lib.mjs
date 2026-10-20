/* _lib.mjs: what the Node tests share: the vault library loaded into this realm the way a page loads it, in order,
 * after checking every file hashes to what VENDOR.md records. */
import vm from 'vm'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
export const RELEASE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
export const VENDOR  = path.join(RELEASE, 'vendor/sg-vault/v0.2.3')
export const sha     = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
export const ORDER   = ['sg-send/sg-send-crypto.js', 'sg-send/sg-send.js', 'sg-vault/sg-vault-crypto.js', 'sg-vault/sg-vault-object-store.js',
    'sg-vault/sg-vault-ref-manager.js', 'sg-vault/sg-vault-commit.js', 'sg-vault/sg-vault.js', 'sg-vault/sg-vault--file-ops.js',
    'sg-vault/sg-vault--folder-ops.js', 'sg-vault/sg-vault--sync.js', 'sg-vault/sg-vault--history.js', 'sg-vault/sg-vault--branches.js']
export function recordedHashes() {
    const md = fs.readFileSync(path.join(VENDOR, 'VENDOR.md'), 'utf8')
    return Object.fromEntries([...md.matchAll(/\| `([^`]+)` \| `([0-9a-f]{64})` \|/g)].map(m => [m[1], m[2]]))
}
export function loadVaultLibrary() {
    if (globalThis.SGVault) return
    for (const f of ORDER) vm.runInThisContext(fs.readFileSync(path.join(VENDOR, f), 'utf8'), { filename: f })
    vm.runInThisContext('globalThis.SGSend = SGSend; globalThis.SGVault = SGVault; globalThis.SGVaultCrypto = SGVaultCrypto; globalThis.SGSendCrypto = SGSendCrypto')
}
