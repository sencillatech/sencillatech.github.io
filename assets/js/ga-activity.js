/**
 * SimpleiTech High-Resolution Analytics & User Journey Tracker
 * - Sends standard GA4 events to Google Analytics (Measurement ID: G-TT09J7SB0C)
 * - Captures clicks and taps across every element and corner of the page
 * - Tracks search keywords, results counts, service selections, and end-to-end journey stages
 * - Dual-reports search and funnel progression to Cloudflare D1 for real-time Admin Analytics
 */
(function () {
  "use strict";

  // Helper for unique anonymous session identification
  function getSessionId() {
    try {
      var id = sessionStorage.getItem("sit_session_id");
      if (!id) {
        id = "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem("sit_session_id", id);
      }
      return id;
    } catch (e) {
      return "sess_local_" + Date.now().toString(36);
    }
  }

  var sessionId = getSessionId();
  var currentSearchQuery = "";
  var currentSelectedService = "";

  // Helper to safely trigger gtag
  function sendGtag(eventName, params) {
    if (typeof window.gtag === "function") {
      try {
        window.gtag("event", eventName, params);
      } catch (err) {
        console.warn("[Analytics] gtag error:", err);
      }
    }
  }

  // Helper to resolve API base for D1 Search Analytics logging
  function getApiBaseUrl() {
    try {
      if (typeof window !== "undefined" && window.location) {
        var host = (window.location.hostname || "").toLowerCase();
        var isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local") || window.location.protocol === "file:";
        if (isLocal) {
          // If running through server.js on port 8080, relative URL works with reverse proxy
          if (window.location.port === "8080") return "";
          return "http://127.0.0.1:8787";
        }
      }
      var meta = document.querySelector('meta[name="simpleitech-services-api"]');
      if (meta && meta.content) {
        return meta.content.replace(/\/search\/?$/, "");
      }
    } catch (e) {}
    return "https://simpleitech-services-api.sencillatech.workers.dev";
  }

  // Report search journey to Cloudflare D1 backend
  function logSearchToBackend(payload) {
    try {
      var url = getApiBaseUrl() + "/analytics/search";
      var body = Object.assign({
        session_id: sessionId,
        keyword: currentSearchQuery || payload.keyword || "(direct navigation)",
        selected_service: currentSelectedService || payload.selected_service || "",
        journey_stage: payload.journey_stage || "searched"
      }, payload);

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // ==========================================
  // 1. PUBLIC API FOR CONSULTATION & SEARCH
  // ==========================================
  window.trackSiteSearch = function (query, resultsCount) {
    if (!query || query.trim().length < 1) return;
    currentSearchQuery = query.trim();

    // Send search query to Google Analytics (ALL search keywords captured in GA)
    sendGtag("search", {
      search_term: currentSearchQuery,
      results_count: resultsCount || 0
    });
    sendGtag("site_search", {
      search_term: currentSearchQuery,
      results_count: resultsCount || 0,
      session_id: sessionId
    });
    // Note: Do not log intermediate keystrokes to D1 backend to reduce API hits and avoid substring spam
  };

  // Capture ONLY the unavailable completed words or set of words after the user clicks on Enter
  window.trackUnmatchedSearchEnter = function (completedQuery) {
    var query = (completedQuery || "").trim();
    if (!query || query.length < 1) return;
    currentSearchQuery = query;

    sendGtag("search", {
      search_term: query,
      results_count: 0
    });
    sendGtag("site_search", {
      search_term: query,
      results_count: 0,
      session_id: sessionId
    });

    logSearchToBackend({
      keyword: query,
      results_count: 0,
      journey_stage: "unmatched_enter"
    });
  };

  window.trackSearchSelect = function (query, serviceName, rate, discount) {
    currentSearchQuery = (query || currentSearchQuery || "").trim();
    currentSelectedService = (serviceName || "").trim();

    sendGtag("select_item", {
      item_name: currentSelectedService,
      search_term: currentSearchQuery,
      item_list_name: "services_catalog",
      price: rate ? Number(rate) : undefined,
      discount: discount ? Number(discount) : undefined
    });

    sendGtag("search_selection", {
      search_term: currentSearchQuery,
      selected_service: currentSelectedService,
      service_rate: rate,
      discount_percentage: discount,
      session_id: sessionId
    });
  };

  window.trackJourneyStage = function (stage, metadata) {
    sendGtag("journey_stage", Object.assign({
      stage_name: stage,
      session_id: sessionId,
      selected_service: currentSelectedService
    }, metadata));
  };

  // ==========================================
  // 2. COMPREHENSIVE CLICK & TAP LISTENER
  // ==========================================
  function extractElementInfo(target) {
    var section = target.closest("section, header, footer, nav, aside, main, dialog") || document.body;
    var sectionId = section.id || section.className || section.tagName.toLowerCase();

    var link = target.closest("a[href]");
    var button = target.closest("button, input[type='button'], input[type='submit'], [role='button']");
    var serviceCard = target.closest(".service-option, .service-suggestion, .service-choice");
    var calendarDay = target.closest(".calendar-day, .calendar-day-button");
    var slotOption = target.closest(".slot-option, [data-slot]");
    var chip = target.closest(".selected-service-chip, .chip-btn");

    var primary = link || button || serviceCard || calendarDay || slotOption || chip || target;
    var text = (primary.innerText || primary.textContent || primary.getAttribute("aria-label") || primary.title || primary.value || "").trim().slice(0, 80);

    return {
      tagName: primary.tagName.toLowerCase(),
      id: primary.id || "",
      className: (primary.className && typeof primary.className === "string") ? primary.className.slice(0, 100) : "",
      text: text,
      section: sectionId,
      isLink: Boolean(link),
      linkHref: link ? link.href : "",
      isButton: Boolean(button),
      isServiceCard: Boolean(serviceCard),
      isCalendar: Boolean(calendarDay || slotOption)
    };
  }

  function handleInteraction(event) {
    var target = event.target;
    if (!target) return;

    var info = extractElementInfo(target);
    var clickX = Math.round(event.clientX || 0);
    var clickY = Math.round(event.clientY || 0);

    // 1. Outbound & Internal Links
    if (info.isLink && info.linkHref) {
      try {
        var url = new URL(info.linkHref, window.location.href);
        if (url.hostname !== window.location.hostname) {
          sendGtag("outbound_click", {
            link_url: url.href,
            link_domain: url.hostname,
            link_text: info.text,
            section: info.section
          });
        } else {
          sendGtag("navigation_click", {
            link_url: url.href,
            link_text: info.text,
            section: info.section
          });
        }
      } catch (e) {}
    }

    // 2. Buttons & CTAs
    if (info.isButton) {
      sendGtag("button_click", {
        button_id: info.id,
        button_text: info.text,
        button_class: info.className,
        section: info.section
      });
    }

    // 3. Service Cards & Options
    if (info.isServiceCard) {
      var choiceInput = target.closest(".service-option") ? target.closest(".service-option").querySelector(".service-choice") : null;
      var serviceName = choiceInput ? choiceInput.value : info.text;
      sendGtag("service_card_click", {
        service_name: serviceName,
        card_class: info.className,
        section: info.section
      });
    }

    // 4. Calendar Day & Slot Options
    if (info.isCalendar) {
      sendGtag("calendar_interaction", {
        element_text: info.text,
        element_type: info.className,
        section: info.section
      });
    }

    // 5. Universal Corner/Element Click Capturing
    sendGtag("user_click", {
      element_tag: info.tagName,
      element_id: info.id,
      element_class: info.className,
      element_text: info.text,
      section_id: info.section,
      click_x: clickX,
      click_y: clickY,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight
    });
  }

  // Listen for both desktop clicks and mobile taps
  document.addEventListener("click", handleInteraction, true);
  document.addEventListener("touchstart", function (e) {
    if (e.touches && e.touches.length === 1) {
      // Lightly track mobile touch location
      var touch = e.touches[0];
      handleInteraction({ target: touch.target, clientX: touch.clientX, clientY: touch.clientY });
    }
  }, { passive: true, capture: true });

  // ==========================================
  // 3. FORM CONTROLS & DROPDOWNS
  // ==========================================
  document.addEventListener("change", function (event) {
    var control = event.target;
    if (!control || !control.matches("input, select, textarea")) return;

    sendGtag("form_interaction", {
      control_id: control.id || "",
      control_name: control.name || "",
      control_type: control.type || control.tagName.toLowerCase(),
      control_value_length: (control.value || "").length
    });

    if (control.id === "consultation-duration") {
      sendGtag("work_days_selected", {
        estimated_duration: control.value,
        session_id: sessionId
      });
    }
  }, true);

  // Form Submit
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    sendGtag("form_submit", {
      form_id: form.id || "",
      form_name: form.getAttribute("name") || "",
      form_action: form.action || ""
    });
  }, true);

  console.info("[SimpleiTech] Google Analytics 4 enhanced click & search journey tracking active.");
})();
