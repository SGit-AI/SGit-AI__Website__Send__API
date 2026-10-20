// nav.js: the family nav, as sgit.ai and secrets.sgit.ai run it. Hover and :focus-within open a dropdown in CSS
// alone; this handles the phone menu button and the fact that a finger has no hover. If this file never loads the
// nav still works, because every group label is a link to that section's own page.
(function () {
    'use strict'
    var nav = document.querySelector('nav.site')
    if (!nav) return
    var toggle = nav.querySelector('.nav-toggle')
    if (toggle) toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open')
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('nav.site .ni-has > .nl')
        var open = nav.querySelector('.ni-has.open')
        if (open && (!link || link.parentNode !== open)) open.classList.remove('open')
        if (!link || !window.matchMedia || !window.matchMedia('(hover: none)').matches) return
        var item = link.parentNode, sub = item.querySelector('.sub')
        if (sub && window.getComputedStyle(sub).position === 'absolute' && !item.classList.contains('open')) {
            event.preventDefault(); item.classList.add('open')
        }
    })
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return
        var open = nav.querySelector('.ni-has.open')
        if (open) open.classList.remove('open')
        if (nav.classList.contains('open')) { nav.classList.remove('open'); if (toggle) toggle.setAttribute('aria-expanded', 'false') }
    })
}())
