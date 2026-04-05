/**
 * ============================================================
 * Reusable Ad Component — SimpleiTech
 * ============================================================
 *
 * Call `SIT_Ads.createSidebarAd(containerEl)` or
 *      `SIT_Ads.createInArticleAd(containerEl)` to inject
 * an <ins class="adsbygoogle"> element into the given container.
 *
 * The ad will only render once the AdSense script has loaded
 * (which in turn only happens after cookie consent).
 *
 * Depends on: assets/js/adsense-config.js
 * ============================================================
 */

window.SIT_Ads = (function () {
  'use strict';

  var cfg = window.ADSENSE_CONFIG || {};

  /**
   * Generic builder for an <ins> ad unit.
   * @param {HTMLElement} container  - DOM element to append the ad into
   * @param {string}      slotId    - AdSense slot ID
   * @param {string}      format    - 'auto' | 'fluid'
   * @param {string}      layout    - optional layout key (e.g. 'in-article')
   */
  function createAdUnit(container, slotId, format, layout) {
    if (!cfg.ADSENSE_ENABLED || !slotId) return;

    // Wrapper — reserves space & avoids CLS
    var wrapper = document.createElement('div');
    wrapper.className = 'sit-ad-wrapper';
    wrapper.setAttribute('aria-label', 'Advertisement');

    // Minimal label
    var label = document.createElement('span');
    label.className = 'sit-ad-label';
    label.textContent = 'Advertisement';
    wrapper.appendChild(label);

    // The actual <ins> element Google requires
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', cfg.PUBLISHER_ID);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-ad-format', format || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    if (layout) {
      ins.setAttribute('data-ad-layout', layout);
    }
    wrapper.appendChild(ins);

    container.appendChild(wrapper);

    // Try to push it if adsbygoogle is loaded
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }

  return {
    /**
     * Sidebar / Display Ad – 300×250-style responsive unit.
     * @param {HTMLElement} container
     */
    createSidebarAd: function (container) {
      createAdUnit(
        container,
        cfg.AD_SLOTS && cfg.AD_SLOTS.SIDEBAR_DISPLAY,
        'auto'
      );
    },

    /**
     * In-Article / Native Ad – fluid layout that blends with content.
     * @param {HTMLElement} container
     */
    createInArticleAd: function (container) {
      createAdUnit(
        container,
        cfg.AD_SLOTS && cfg.AD_SLOTS.IN_ARTICLE,
        'fluid',
        'in-article'
      );
    }
  };
})();
