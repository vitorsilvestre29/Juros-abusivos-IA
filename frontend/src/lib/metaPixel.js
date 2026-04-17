const PIXEL_ID = '1662797128369431'

let initialized = false

function ensureQueue() {
  if (!window.fbq) {
    const fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments)
      } else {
        fbq.queue.push(arguments)
      }
    }

    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []

    window.fbq = fbq
    window._fbq = fbq
  }
}

export function initMetaPixel() {
  if (typeof window === 'undefined' || initialized) return

  ensureQueue()

  const hasScript = document.querySelector('script[data-meta-pixel="true"]')
  if (!hasScript) {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    script.setAttribute('data-meta-pixel', 'true')
    document.head.appendChild(script)
  }

  window.fbq('init', PIXEL_ID)
  initialized = true
}

export function trackPageView() {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', 'PageView')
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', eventName, params)
}
