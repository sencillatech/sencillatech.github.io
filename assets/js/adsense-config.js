/**
 * ============================================================
 * Google AdSense Configuration — SimpleiTech
 * ============================================================
 *
 * INSTRUCTIONS:
 *   1. Replace 'ca-pub-XXXXXXXXXXXXXXXX' below with your real
 *      AdSense Publisher ID.
 *   2. Update ads.txt in the project root with the same pub ID.
 *   3. To disable ads entirely (e.g. in dev), set ADSENSE_ENABLED = false.
 *
 * This centralised config avoids hard-coding the pub ID across
 * every HTML page.  All ad-related scripts reference this object.
 * ============================================================
 */

window.ADSENSE_CONFIG = {
  /** Google AdSense Publisher ID (the "ca-pub-…" string). */
  PUBLISHER_ID: 'ca-pub-XXXXXXXXXXXXXXXX',

  /** Master kill-switch for ads across the site. */
  ADSENSE_ENABLED: true,

  /** Enable Google Auto Ads (recommended primary method). */
  AUTO_ADS_ENABLED: true,

  /**
   * Ad-unit slot IDs for manual placements.
   * Leave empty strings until you create the units in your AdSense dashboard.
   */
  AD_SLOTS: {
    SIDEBAR_DISPLAY:  '',   // e.g. '1234567890'
    IN_ARTICLE:       ''    // e.g. '0987654321'
  }
};
