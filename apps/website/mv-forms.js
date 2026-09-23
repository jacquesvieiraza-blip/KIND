// ── THE TWO WEBSITE FORMS ────────────────────────────────────────────────────────────────
//
// contact.html and get-started.html shipped with <button type="button"> and no handler: the
// visitor filled the form in, pressed the button, and nothing happened at all — no request,
// no error, no message. This is what makes them send.
//
// One file rather than two inline copies, because the two forms differ only in which fields
// they carry and both need the same error handling, and two copies of error handling is how
// one of them quietly stops matching the other.
//
// Progressive by design: the markup is a real <form> and the button is a real submit button,
// so the page is still coherent if this script fails to load. The handler intercepts the
// submit; it does not invent it.
(function () {
  'use strict'

  var API = 'https://kindapi-production-e64c.up.railway.app'

  function byName(form, name) {
    var el = form.querySelector('[name="' + name + '"]')
    return el ? String(el.value || '').trim() : ''
  }

  function status(form, kind, text) {
    var box = form.querySelector('.form-status')
    if (!box) return
    box.className = 'form-status form-status--' + kind
    box.textContent = text
  }

  function payload(form, type) {
    var out = { type: type, name: byName(form, 'name'), email: byName(form, 'email') }
    var fields = type === 'contact'
      ? { contacting_as: 'i-am-contacting-as', subject: 'subject', message: 'message' }
      : { company: 'company', website: 'website', outcome: 'outcome', target: 'target', volume: 'volume', when: 'when' }
    for (var key in fields) {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) continue
      var v = byName(form, fields[key])
      if (v) out[key] = v
    }
    return out
  }

  function wire(form, type) {
    var button = form.querySelector('button')
    if (!button) return

    form.addEventListener('submit', function (ev) {
      ev.preventDefault()

      var body = payload(form, type)

      // Checked here as well as on the server. The server is the one that decides; this is
      // so the visitor is told which field is wrong without a round trip.
      if (!body.name) return status(form, 'error', 'Please tell us your name.')
      if (!body.email || body.email.indexOf('@') < 1 || body.email.indexOf('.') < 0) {
        return status(form, 'error', 'Please enter a work email we can reply to.')
      }

      var original = button.textContent
      button.disabled = true
      button.textContent = 'Sending…'
      status(form, 'sending', 'Sending…')

      fetch(API + '/api/public/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.json().catch(function () { return { success: false } }).then(function (j) {
            return { ok: r.ok, json: j }
          })
        })
        .then(function (r) {
          if (!r.ok || !r.json.success) {
            // 429 is the rate limiter, and "try again" is useless advice for it.
            var msg = r.json && r.json.error === 'not-delivered'
              ? 'We could not deliver that. Please email hello@get-kind.com and we will reply the same day.'
              : (r.json && r.json.error) || 'Something went wrong. Please email hello@get-kind.com.'
            status(form, 'error', msg)
            button.disabled = false
            button.textContent = original
            return
          }
          // Replace the form rather than leaving a filled-in form under a success message —
          // that reads as "did it send?" and invites a second submission.
          form.innerHTML =
            '<div class="form-status form-status--ok" style="margin:0">' +
            '<strong>Thank you — that has reached us.</strong><br/>' +
            'We read everything that comes through this form and reply the same day. ' +
            'If it is urgent, email hello@get-kind.com.' +
            '</div>'
        })
        .catch(function () {
          status(form, 'error', 'We could not reach our server. Please email hello@get-kind.com and we will reply the same day.')
          button.disabled = false
          button.textContent = original
        })
    })
  }

  function init() {
    var type = document.body.getAttribute('data-form')
    if (!type) return
    var form = document.querySelector('form')
    if (form) wire(form, type)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
