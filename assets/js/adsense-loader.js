/**
 * ============================================================
 * Google AdSense Loader — SimpleiTech
 * ============================================================
 *
 * Injects the AdSense <script> tag ONLY after cookie consent
 * has been granted.  Also initialises Auto Ads and renders
 * any manual ad-unit placeholders present on the page.
 *
 * Depends on:
 *   - assets/js/adsense-config.js  (provides ADSENSE_CONFIG)
 *   - assets/js/consent-banner.js  (dispatches 'cookie-consent-accepted')
 * ============================================================
 */

(function () {
  'use strict';

  var injected = false;

  function loadAdSense() {
    if (injected) return;
    injected = true;

    var cfg = window.ADSENSE_CONFIG;
    if (!cfg || !cfg.ADSENSE_ENABLED) return;

    var pubId = cfg.PUBLISHER_ID;
    if (!pubId || pubId === 'ca-pub-XXXXXXXXXXXXXXXX') {
      console.warn('[AdSense] Publisher ID not configured. Skipping ad load.');
      return;
    }

    // 1. Inject the main AdSense script (async to avoid blocking)
    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + pubId;
    document.head.appendChild(script);

    // 2. After script loads, push Auto Ads config and render manual slots
    script.addEventListener('load', function () {
      // Auto Ads
      if (cfg.AUTO_ADS_ENABLED) {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: pubId,
          enable_page_level_ads: true
        });
      }

      // Render manual ad units already present in the DOM
      renderManualAds();
    });

    script.addEventListener('error', function () {
      console.error('[AdSense] Failed to load adsbygoogle script.');
    });
  }

  /**
   * Find all <ins class="adsbygoogle"> elements on the page that
   * haven't been initialised yet and push them.
   */
  function renderManualAds() {
    var slots = document.querySelectorAll('ins.adsbygoogle[data-ad-slot]');
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].dataset.adsbygoogleStatus) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.warn('[AdSense] Error pushing ad slot:', e);
        }
      }
    }
  }

  // Listen for consent
  window.addEventListener('cookie-consent-accepted', loadAdSense);
})();
