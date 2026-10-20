// theme.js: set html[data-theme] before the first paint from this browser's choice (the key is the site's own, see
// site.json theme_key, read from the <script> tag's data attribute or the default), else from the system; wire the
// picker once the DOM is there. Served from this origin only; nothing else is stored.
(function () {
    'use strict'
    var KEY = (document.currentScript && document.currentScript.getAttribute('data-key')) || 'sgit.send.ui.theme'
    var THEMES = ['night', 'day']
    function current() {
        try { var v = localStorage.getItem(KEY); if (THEMES.indexOf(v) >= 0) return v } catch (e) { /* no storage */ }
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'day' : 'night'
    }
    function apply(t) {
        document.documentElement.setAttribute('data-theme', t)
        var buttons = document.querySelectorAll('[data-theme-pick]')
        for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-theme-pick') === t ? 'true' : 'false')
    }
    apply(current())
    document.addEventListener('DOMContentLoaded', function () {
        apply(current())
        document.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-theme-pick]')
            if (!b) return
            var t = b.getAttribute('data-theme-pick')
            try { localStorage.setItem(KEY, t) } catch (err) { /* no storage */ }
            apply(t)
        })
    })
}())
