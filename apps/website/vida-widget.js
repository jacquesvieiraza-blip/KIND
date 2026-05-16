;(function () {
  'use strict'

  var API_BASE = 'https://kindapi-production-83cb.up.railway.app'

  var cfg = window.VidaConfig || {}
  var clientId = cfg.clientId
  if (!clientId) return

  // ── State ─────────────────────────────────────────────────────────────────
  var sessionId   = null
  var isOpen      = false
  var isFetching  = false
  var widgetCfg   = null
  var initialized = false  // session created + greeting shown

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  function apiFetch(method, path, body, cb) {
    var xhr = new XMLHttpRequest()
    xhr.open(method, API_BASE + path, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      try {
        var data = JSON.parse(xhr.responseText)
        cb(null, data)
      } catch (e) {
        cb(e, null)
      }
    }
    xhr.onerror = function () { cb(new Error('Network error'), null) }
    xhr.send(body ? JSON.stringify(body) : null)
  }

  // ── DOM creation ───────────────────────────────────────────────────────────
  function el(tag, styles, attrs) {
    var node = document.createElement(tag)
    if (styles) Object.assign(node.style, styles)
    if (attrs)  Object.assign(node, attrs)
    return node
  }

  function buildWidget(vidaCfg) {
    widgetCfg = vidaCfg
    var color = vidaCfg.primary_color || '#0066FF'

    // ── Bubble ──────────────────────────────────────────────────────────────
    var bubble = el('button', {
      position:     'fixed',
      bottom:       '24px',
      right:        '24px',
      width:        '56px',
      height:       '56px',
      borderRadius: '50%',
      background:   color,
      border:       'none',
      cursor:       'pointer',
      boxShadow:    '0 4px 16px rgba(0,0,0,0.18)',
      zIndex:       '2147483646',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      transition:   'transform 0.15s ease',
    })
    bubble.setAttribute('aria-label', 'Open chat')
    bubble.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    bubble.onmouseenter = function () { bubble.style.transform = 'scale(1.1)' }
    bubble.onmouseleave = function () { bubble.style.transform = 'scale(1)' }

    // ── Panel ───────────────────────────────────────────────────────────────
    var panel = el('div', {
      position:     'fixed',
      bottom:       '92px',
      right:        '24px',
      width:        '360px',
      height:       '520px',
      borderRadius: '16px',
      background:   '#fff',
      boxShadow:    '0 8px 40px rgba(0,0,0,0.18)',
      zIndex:       '2147483646',
      display:      'none',
      flexDirection: 'column',
      overflow:     'hidden',
      fontFamily:   '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    })

    // Header
    var header = el('div', {
      background:   color,
      padding:      '14px 16px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      flexShrink:   '0',
    })
    var headerLeft = el('div')
    var headerTitle = el('p', {
      margin:     '0',
      color:      '#fff',
      fontWeight: '600',
      fontSize:   '15px',
      lineHeight: '1.2',
    })
    headerTitle.textContent = vidaCfg.bot_name || 'Vida'
    var headerSub = el('p', {
      margin:     '2px 0 0',
      color:      'rgba(255,255,255,0.75)',
      fontSize:   '11px',
    })
    headerSub.textContent = 'by K.I.N.D'
    headerLeft.appendChild(headerTitle)
    headerLeft.appendChild(headerSub)

    var closeBtn = el('button', {
      background:  'rgba(255,255,255,0.2)',
      border:      'none',
      color:       '#fff',
      cursor:      'pointer',
      borderRadius: '6px',
      width:       '28px',
      height:      '28px',
      fontSize:    '18px',
      lineHeight:  '1',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      padding:     '0',
    })
    closeBtn.innerHTML = '&times;'
    closeBtn.setAttribute('aria-label', 'Close chat')

    header.appendChild(headerLeft)
    header.appendChild(closeBtn)

    // Messages area
    var messagesArea = el('div', {
      flex:       '1',
      overflowY:  'auto',
      padding:    '16px',
      display:    'flex',
      flexDirection: 'column',
      gap:        '10px',
    })

    // Input area
    var inputArea = el('div', {
      padding:     '10px 12px',
      borderTop:   '1px solid #f0f0f0',
      display:     'flex',
      gap:         '8px',
      alignItems:  'flex-end',
      flexShrink:  '0',
      background:  '#fff',
    })
    var input = el('textarea', {
      flex:        '1',
      border:      '1px solid #e5e7eb',
      borderRadius: '10px',
      padding:     '9px 12px',
      fontSize:    '14px',
      resize:      'none',
      outline:     'none',
      lineHeight:  '1.4',
      maxHeight:   '100px',
      fontFamily:  'inherit',
      color:       '#111',
    })
    input.placeholder = 'Type a message…'
    input.rows = 1

    var sendBtn = el('button', {
      background:   color,
      border:       'none',
      borderRadius: '10px',
      width:        '38px',
      height:       '38px',
      cursor:       'pointer',
      flexShrink:   '0',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      transition:   'opacity 0.15s',
    })
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
    sendBtn.setAttribute('aria-label', 'Send')

    inputArea.appendChild(input)
    inputArea.appendChild(sendBtn)

    panel.appendChild(header)
    panel.appendChild(messagesArea)
    panel.appendChild(inputArea)

    document.body.appendChild(bubble)
    document.body.appendChild(panel)

    // ── Message rendering ────────────────────────────────────────────────────
    function addMessage(text, role) {
      var isUser = role === 'user'
      var row = el('div', {
        display:        'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      })
      var bubble = el('div', {
        maxWidth:     '80%',
        padding:      '9px 13px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background:   isUser ? color : '#f3f4f6',
        color:        isUser ? '#fff' : '#111',
        fontSize:     '14px',
        lineHeight:   '1.5',
        wordBreak:    'break-word',
        whiteSpace:   'pre-wrap',
      })
      bubble.textContent = text
      row.appendChild(bubble)
      messagesArea.appendChild(row)
      messagesArea.scrollTop = messagesArea.scrollHeight
      return row
    }

    function addTypingIndicator() {
      var row = el('div', { display: 'flex', justifyContent: 'flex-start' })
      var bub = el('div', {
        padding:      '10px 14px',
        borderRadius: '16px 16px 16px 4px',
        background:   '#f3f4f6',
        fontSize:     '20px',
        letterSpacing: '2px',
        color:        '#9ca3af',
      })
      bub.textContent = '•••'
      row.appendChild(bub)
      messagesArea.appendChild(row)
      messagesArea.scrollTop = messagesArea.scrollHeight
      return row
    }

    function addEmailPrompt() {
      var row = el('div', { display: 'flex', justifyContent: 'flex-start' })
      var card = el('div', {
        background:   '#f0f7ff',
        border:       '1px solid #bfdbfe',
        borderRadius: '12px',
        padding:      '12px',
        maxWidth:     '90%',
        fontSize:     '13px',
        color:        '#1e40af',
      })
      var label = el('p', { margin: '0 0 8px', fontWeight: '500' })
      label.textContent = "What's your email? I can send you more info."
      var emailInput = el('input', {
        width:        '100%',
        border:       '1px solid #93c5fd',
        borderRadius: '8px',
        padding:      '7px 10px',
        fontSize:     '13px',
        outline:      'none',
        boxSizing:    'border-box',
        fontFamily:   'inherit',
        color:        '#111',
      })
      emailInput.type = 'email'
      emailInput.placeholder = 'you@example.com'
      var submitBtn = el('button', {
        marginTop:    '8px',
        background:   color,
        border:       'none',
        borderRadius: '8px',
        padding:      '6px 14px',
        color:        '#fff',
        fontSize:     '13px',
        cursor:       'pointer',
        fontFamily:   'inherit',
        fontWeight:   '500',
      })
      submitBtn.textContent = 'Send'
      submitBtn.onclick = function () {
        var emailVal = emailInput.value.trim()
        if (!emailVal || !sessionId) return
        apiFetch('POST', '/vida/widget/' + clientId + '/session/' + sessionId + '/message', {
          message:      'My email is ' + emailVal,
          visitorEmail: emailVal,
        }, function (err, data) {
          if (!err && data && data.data && data.data.reply) {
            addMessage(data.data.reply, 'assistant')
          }
        })
        row.remove()
      }
      card.appendChild(label)
      card.appendChild(emailInput)
      card.appendChild(submitBtn)
      row.appendChild(card)
      messagesArea.appendChild(row)
      messagesArea.scrollTop = messagesArea.scrollHeight
    }

    // ── Session init ─────────────────────────────────────────────────────────
    function initSession() {
      if (initialized) return
      initialized = true
      apiFetch('POST', '/vida/widget/' + clientId + '/session', { channel: 'web' }, function (err, data) {
        if (err || !data || !data.data) return
        sessionId = data.data.sessionId
        // Show greeting
        var greeting = vidaCfg.greeting || 'Hi! How can I help you today?'
        addMessage(greeting, 'assistant')
      })
    }

    // ── Send message ─────────────────────────────────────────────────────────
    function sendMessage() {
      var text = input.value.trim()
      if (!text || isFetching || !sessionId) return
      isFetching = true
      input.value = ''
      input.style.height = 'auto'
      addMessage(text, 'user')
      var typing = addTypingIndicator()
      apiFetch('POST', '/vida/widget/' + clientId + '/session/' + sessionId + '/message', { message: text }, function (err, data) {
        typing.remove()
        isFetching = false
        if (err || !data || !data.data) {
          addMessage('Sorry, something went wrong. Please try again.', 'assistant')
          return
        }
        var reply = data.data.reply
        addMessage(reply, 'assistant')
        if (data.data.shouldCollectEmail) {
          setTimeout(addEmailPrompt, 400)
        }
      })
    }

    // ── Auto-resize textarea ─────────────────────────────────────────────────
    input.addEventListener('input', function () {
      input.style.height = 'auto'
      input.style.height = Math.min(input.scrollHeight, 100) + 'px'
    })

    // ── Events ───────────────────────────────────────────────────────────────
    sendBtn.addEventListener('click', sendMessage)
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    })

    function openPanel() {
      isOpen = true
      panel.style.display = 'flex'
      bubble.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      initSession()
      input.focus()
    }

    function closePanel() {
      isOpen = false
      panel.style.display = 'none'
      bubble.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      if (sessionId) {
        apiFetch('POST', '/vida/widget/' + clientId + '/session/' + sessionId + '/end', {}, function () {})
      }
    }

    bubble.addEventListener('click', function () {
      if (isOpen) closePanel(); else openPanel()
    })
    closeBtn.addEventListener('click', closePanel)

    // Mobile: full-screen below 480px
    function handleResize() {
      if (window.innerWidth <= 480) {
        Object.assign(panel.style, { bottom: '0', right: '0', width: '100vw', height: '100vh', borderRadius: '0' })
      } else {
        Object.assign(panel.style, { bottom: '92px', right: '24px', width: '360px', height: '520px', borderRadius: '16px' })
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  apiFetch('GET', '/vida/widget/' + clientId + '/config', null, function (err, data) {
    if (err || !data || !data.data) return
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { buildWidget(data.data) })
    } else {
      buildWidget(data.data)
    }
  })
})()
