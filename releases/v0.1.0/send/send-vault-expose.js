/* send-vault-expose.js, api.send.sgit.ai v0.1.0
 *
 * A classic script, loaded after the twelve vendored vault library files. Those files declare their classes with
 * top-level `class` statements, which in a classic script are global lexical bindings and not properties of
 * globalThis, so an ES module cannot see them. This one line each makes them reachable from send-vault.js. It is a
 * file rather than an inline script so a page with `script-src 'self'` can load it.
 */
globalThis.SGSend = SGSend; globalThis.SGVault = SGVault; globalThis.SGVaultCrypto = SGVaultCrypto; globalThis.SGSendCrypto = SGSendCrypto
