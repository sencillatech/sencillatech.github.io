/**
 * ============================================================
 * Cookie Consent Banner — GDPR / CCPA Compliance
 * ============================================================
 *
 * Displays a non-intrusive consent banner on first visit.
 * The AdSense script is ONLY loaded after the user accepts.
 *
 * Consent state is persisted in localStorage so the banner
 * doesn't appear on every page load.
 *
 * Depends on: (nothing — self-contained)
 * ============================================================
 */

(function () {
  'use strict';

  var CONSENT_KEY = 'sit_cookie_consent';  // localStorage key

  /** Check whether consent has already been given. */
  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'accepted';
    } catch (_) {
      return false;
    }
  }

  /** Persist the user's acceptance. */
  function setConsent() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch (_) { /* quota errors, private browsing, etc. */ }
  }

  /** Fire a custom event so other scripts (adsense-loader) can react. */
  function dispatchConsentEvent() {
    window.dispatchEvent(new CustomEvent('cookie-consent-accepted'));
  }

  /** Build and inject the consent banner into the DOM. */
  function showBanner() {
    // Prevent duplicates
    if (document.getElementById('cookie-consent-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="ccb-inner">' +
        '<div class="ccb-text">' +
          '<svg class="ccb-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>' +
            '<path d="M12 16v-4"/><path d="M12 8h.01"/>' +
          '</svg>' +
          '<p>We use cookies and similar technologies to serve personalised ads, analyse traffic, and improve your experience. ' +
          'By clicking <strong>"Accept"</strong> you consent to our use of cookies in accordance with our ' +
          '<a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Ad Policy</a>.</p>' +
        '</div>' +
        '<div class="ccb-actions">' +
          '<button id="ccb-accept" class="ccb-btn ccb-btn-accept">Accept</button>' +
          '<button id="ccb-decline" class="ccb-btn ccb-btn-decline">Decline</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);

    // Trigger reflow then add the visible class for CSS transition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('ccb-visible');
      });
    });

    document.getElementById('ccb-accept').addEventListener('click', function () {
      setConsent();
      hideBanner(banner);
      dispatchConsentEvent();
    });

    document.getElementById('ccb-decline').addEventListener('click', function () {
      hideBanner(banner);
      // Do NOT set consent — ads will not load
    });
  }

  function hideBanner(banner) {
    banner.classList.remove('ccb-visible');
    banner.classList.add('ccb-hiding');
    setTimeout(function () { banner.remove(); }, 400);
  }

  // ----- Initialise -----
  if (hasConsent()) {
    // Already accepted previously — fire event immediately so ads can load
    dispatchConsentEvent();
  } else {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
