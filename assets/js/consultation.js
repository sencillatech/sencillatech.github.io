(function () {
  "use strict";

  var form = document.getElementById("consultation-form");
  if (!form) return;

  var CAL_API = "https://api.cal.com/v2";
  var CAL_USER = "simpleitech";
  var CAL_EVENT = "30min";
  var CAL_TIME_ZONE = "Asia/Kolkata";
  var CAL_SLOTS_VERSION = "2024-09-04";
  var CAL_BOOKING_VERSION = "2026-02-25";
  var servicesApiConfig = document.querySelector('meta[name="simpleitech-services-api"]');
  var SERVICES_API_URL = servicesApiConfig
    ? servicesApiConfig.content
    : "https://simpleitech-services-api.sencillatech.workers.dev/search";

  var search = document.getElementById("service-search");
  var options = document.getElementById("service-options");
  var serviceCards = Array.prototype.slice.call(document.querySelectorAll("#service-catalog .service-option"));
  var serviceChoices = Array.prototype.slice.call(document.querySelectorAll(".service-choice"));
  var duration = document.getElementById("consultation-duration");
  var details = document.getElementById("consultation-details");
  var stepProgress = document.getElementById("consultation-steps");
  var proceedButton = document.getElementById("consultation-proceed");
  var agreement = document.getElementById("price-agreement");
  var findTimeButton = document.getElementById("find-time-button");
  var bookingPanel = document.getElementById("booking-panel");
  var submitButton = document.getElementById("consultation-submit");
  var serviceSummary = document.getElementById("selected-services");
  var serviceChips = document.getElementById("selected-service-chips");
  var searchStatus = document.getElementById("service-search-status");
  var estimateCard = document.getElementById("estimate-card");
  var estimateTitle = document.getElementById("estimate-title");
  var estimateValue = document.getElementById("estimate-value");
  var estimateTerms = document.getElementById("estimate-terms");
  var result = document.getElementById("consultation-result");
  var calendarMonth = document.getElementById("calendar-month");
  var calendarDays = document.getElementById("calendar-days");
  var calendarStatus = document.getElementById("calendar-status");
  var slotPicker = document.getElementById("slot-picker");
  var slotPickerTitle = document.getElementById("slot-picker-title");
  var slotOptions = document.getElementById("slot-options");
  var slotSummary = document.getElementById("selected-slot-summary");
  var selectedSlot = null;
  var selectedDate = null;
  var availableSlots = {};
  var calendarMonthDate = new Date();
  calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
  var requestNumber = null;
  var submitting = false;
  var matchingServices = [];
  var activeSuggestion = -1;
  var suggestionLimit = 8;
  var agreementCopy = document.getElementById("price-agreement-copy");
  var estimateDisclaimer = estimateCard.querySelector(".estimate-disclaimer");
  var estimateBadge = estimateCard.querySelector(".estimate-eyebrow span");
  var catalogSearchTimer = null;
  var catalogRequestId = 0;
  var catalogAbortController = null;
  var apiServiceCards = Object.create(null);

  function selectedServices() {
    return serviceChoices.filter(function (choice) {
      return choice.checked;
    });
  }

  function setSearchExpanded(expanded) {
    options.hidden = !expanded;
    search.setAttribute("aria-expanded", String(expanded));
    if (!expanded) {
      search.removeAttribute("aria-activedescendant");
      activeSuggestion = -1;
    }
  }

  function renderSelectedServices() {
    serviceChips.textContent = "";

    selectedServices().forEach(function (choice) {
      var chip = document.createElement("span");
      chip.className = "selected-service-chip";

      var name = document.createElement("span");
      name.className = "selected-service-name";
      name.textContent = choice.value;

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "selected-service-remove";
      remove.setAttribute("aria-label", "Remove " + choice.value);
      remove.textContent = "\u00d7";
      remove.addEventListener("click", function () {
        choice.checked = false;
        choice.dispatchEvent(new Event("change", { bubbles: true }));
        search.focus();
      });

      chip.appendChild(name);
      chip.appendChild(remove);
      serviceChips.appendChild(chip);
    });
  }

  function updateSearchStatus() {
    var selected = selectedServices().map(function (choice) {
      return choice.value;
    });
    searchStatus.textContent = selected.length
      ? selected.length + (selected.length === 1 ? " service selected" : " services selected") + " · search to add more"
      : (search.value.trim()
        ? (matchingServices.length ? matchingServices.length + " matching " + (matchingServices.length === 1 ? "service" : "services") : "No matching services")
        : "Choose one or more services");
    serviceSummary.value = selected.join(", ");
    proceedButton.disabled = selected.length === 0 || !duration.value || submitting;
  }

  function renderSuggestions() {
    options.textContent = "";
    activeSuggestion = -1;
    search.removeAttribute("aria-activedescendant");

    matchingServices.slice(0, suggestionLimit).forEach(function (card, index) {
      var choice = card.querySelector(".service-choice");
      var suggestion = document.createElement("button");
      suggestion.type = "button";
      suggestion.id = "service-suggestion-" + index;
      suggestion.className = "service-suggestion";
      suggestion.setAttribute("role", "option");
      suggestion.setAttribute("aria-selected", "false");

      var icon = card.querySelector(".service-option-icon");
      if (icon) suggestion.appendChild(icon.cloneNode(true));

      var copy = document.createElement("span");
      copy.className = "service-suggestion-copy";

      var title = document.createElement("strong");
      title.textContent = choice.value;
      copy.appendChild(title);

      var description = card.querySelector(".service-option-copy small");
      if (description) {
        var detail = document.createElement("small");
        detail.textContent = description.textContent;
        copy.appendChild(detail);
      }

      suggestion.appendChild(copy);
      suggestion.addEventListener("click", function () {
        choice.checked = true;
        choice.dispatchEvent(new Event("change", { bubbles: true }));
        search.focus();
      });
      options.appendChild(suggestion);
    });

    if (!matchingServices.length && search.value.trim()) {
      var empty = document.createElement("p");
      empty.className = "service-suggestion-empty";
      empty.textContent = "No exact match yet. Try a broader term or tell us more in your project details.";
      options.appendChild(empty);
    }

    setSearchExpanded(Boolean(search.value.trim()));
  }

  function filterServices() {
    var query = search.value.trim().toLowerCase().replace(/\s+/g, " ");
    var terms = query ? query.split(" ") : [];
    var selected = selectedServices();

    matchingServices = terms.length
      ? serviceCards.filter(function (card) {
        var choice = card.querySelector(".service-choice");
        if (choice.checked) return false;

        var searchableText = (choice.value + " " + (card.dataset.search || "")).toLowerCase();
        return terms.every(function (term) {
          return searchableText.indexOf(term) !== -1;
        });
      })
      : [];

    renderSuggestions();
    updateSearchStatus();

    window.clearTimeout(catalogSearchTimer);
    catalogRequestId += 1;
    if (catalogAbortController) catalogAbortController.abort();
    if (query.length < 2) return;

    var requestId = catalogRequestId;
    catalogSearchTimer = window.setTimeout(function () {
      searchCatalog(query, requestId);
    }, 250);
  }

  function addCatalogService(service) {
    var existing = serviceCards.filter(function (card) {
      var choice = card.querySelector(".service-choice");
      return choice && choice.value.toLowerCase() === service.service_name.toLowerCase();
    })[0];
    if (existing) return existing;

    var card = document.createElement("label");
    card.className = "service-option";
    card.dataset.search = [service.category, service.service_group, service.description, service.best_for].join(" ").toLowerCase();
    var baseMin = service.india_price_from != null ? Number(service.india_price_from) : Number(service.website_price || 0);
    var baseMax = service.india_price_to != null ? Number(service.india_price_to) : Number(service.website_price || baseMin);
    var discount = Math.min(100, Math.max(0, Number(service.discount_percentage || 0)));
    card.dataset.rate = String(Math.round(baseMin * (1 - discount / 100)));
    card.dataset.rateMin = String(Math.round(baseMin * (1 - discount / 100)));
    card.dataset.rateMax = String(Math.round(baseMax * (1 - discount / 100)));
    card.dataset.hourly = /hour/i.test(service.pricing_unit || "");
    card.dataset.custom = String(!baseMin && !baseMax);
    card.dataset.apiServiceId = service.id;

    var choice = document.createElement("input");
    choice.className = "service-choice";
    choice.type = "checkbox";
    choice.value = service.service_name;
    choice.dataset.apiServiceId = service.id;

    var icon = document.createElement("span");
    icon.className = "service-option-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\u2726";

    var copy = document.createElement("span");
    copy.className = "service-option-copy";
    var title = document.createElement("strong");
    title.textContent = service.service_name;
    var detail = document.createElement("small");
    detail.textContent = [service.category, service.service_group].filter(Boolean).join(" \u00b7 ") || "SimpleiTech consulting service";
    copy.appendChild(title);
    copy.appendChild(detail);

    card.appendChild(choice);
    card.appendChild(icon);
    card.appendChild(copy);
    document.getElementById("service-catalog").appendChild(card);
    serviceCards.push(card);
    serviceChoices.push(choice);
    apiServiceCards[service.id] = card;
    attachServiceChoice(choice);
    return card;
  }

  async function searchCatalog(query, requestId) {
    catalogAbortController = new AbortController();
    try {
      var response = await fetch(SERVICES_API_URL + "?q=" + encodeURIComponent(query), {
        signal: catalogAbortController.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Service search returned HTTP " + response.status);
      var data = await response.json();
      if (requestId !== catalogRequestId || !Array.isArray(data.results)) return;

      var resultIds = Object.create(null);
      matchingServices = data.results.map(function (service) {
        resultIds[service.id] = true;
        return addCatalogService(service);
      }).filter(function (card) {
        var choice = card.querySelector(".service-choice");
        return choice && !choice.checked;
      });
      Object.keys(apiServiceCards).forEach(function (serviceId) {
        var staleCard = apiServiceCards[serviceId];
        var staleChoice = staleCard.querySelector(".service-choice");
        if (!resultIds[serviceId] && staleChoice && !staleChoice.checked) {
          staleCard.remove();
          serviceCards = serviceCards.filter(function (item) { return item !== staleCard; });
          serviceChoices = serviceChoices.filter(function (item) { return item !== staleChoice; });
          delete apiServiceCards[serviceId];
        }
      });
      renderSuggestions();
      updateSearchStatus();
    } catch (error) {
      if (error.name !== "AbortError") {
        // Keep the built-in suggestions usable while the API is unavailable.
      }
    }
  }

  function setActiveSuggestion(index) {
    var suggestions = options.querySelectorAll(".service-suggestion");
    if (!suggestions.length) return;
    activeSuggestion = (index + suggestions.length) % suggestions.length;

    Array.prototype.forEach.call(suggestions, function (suggestion, suggestionIndex) {
      suggestion.setAttribute("aria-selected", String(suggestionIndex === activeSuggestion));
    });
    search.setAttribute("aria-activedescendant", suggestions[activeSuggestion].id);
  }

  function attachServiceChoice(choice) {
    choice.addEventListener("change", function () {
      renderSelectedServices();
      search.value = "";
      filterServices();
      updateEstimate();
      resetBookingForEstimateChange();
      updateFindTimeAvailability();
    });
  }

  function addCustomService() {
    var name = search.value.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) return false;

    var duplicate = selectedServices().some(function (choice) {
      return choice.value.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      search.value = "";
      filterServices();
      return true;
    }

    var card = document.createElement("label");
    card.className = "service-option";
    card.dataset.search = name.toLowerCase();
    card.dataset.rate = "0";
    card.dataset.custom = "true";

    var choice = document.createElement("input");
    choice.className = "service-choice";
    choice.type = "checkbox";
    choice.value = name;
    choice.checked = true;

    var icon = document.createElement("span");
    icon.className = "service-option-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\u2726";

    var copy = document.createElement("span");
    copy.className = "service-option-copy";
    var title = document.createElement("strong");
    title.textContent = name;
    var description = document.createElement("small");
    description.textContent = "Custom service — quote tailored to your request";
    copy.appendChild(title);
    copy.appendChild(description);

    card.appendChild(choice);
    card.appendChild(icon);
    card.appendChild(copy);
    document.getElementById("service-catalog").appendChild(card);
    serviceCards.push(card);
    serviceChoices.push(choice);
    attachServiceChoice(choice);

    search.value = "";
    renderSelectedServices();
    filterServices();
    updateEstimate();
    resetBookingForEstimateChange();
    updateFindTimeAvailability();
    search.focus();
    return true;
  }

  function updateProgress(currentStep, completed) {
    Array.prototype.forEach.call(stepProgress.querySelectorAll(".consultation-step"), function (step) {
      var number = Number(step.dataset.step);
      var isCurrent = !completed && number === currentStep;
      step.classList.toggle("is-current", isCurrent);
      step.classList.toggle("is-complete", completed || number < currentStep);
      if (isCurrent) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });
  }

  function updateEstimate() {
    var selected = selectedServices();
    var durationValue = duration.value;
    var notSure = durationValue === "not-sure";
    var hours = Number(durationValue);
    if (!selected.length || (!notSure && !hours)) {
      estimateCard.hidden = true;
      estimateValue.value = "";
      return;
    }

    var cards = selected.map(function (choice) { return choice.closest(".service-option"); });
    var hasCustomService = selected.some(function (choice) {
      return choice.closest(".service-option").dataset.custom === "true";
    });
    if (hasCustomService) {
      estimateTitle.textContent = "Custom quote after we review your request";
      estimateValue.value = "Custom quotation required" + (notSure ? "; estimated work duration not sure yet" : " for " + hours + (hours === 1 ? " work hour" : " work hours")) + "; no sample price shown.";
      agreementCopy.textContent = "I understand this custom service needs a tailored quotation and the final price will be confirmed in writing. ";
      estimateTerms.value = "Accepted: custom service requires a tailored written quotation; no sample rate shown.";
      estimateCard.classList.add("has-custom-service");
      estimateBadge.textContent = "TAILORED QUOTE";
      estimateDisclaimer.textContent = "We’ll review the scope you describe and confirm the service details and price in a written quotation before any paid work begins.";
      estimateCard.hidden = false;
      return;
    }

    var minimum = 0;
    var maximum = 0;
    cards.forEach(function (card) {
      var low = Number(card.dataset.rateMin || card.dataset.rate || 0);
      var high = Number(card.dataset.rateMax || card.dataset.rate || low);
      var multiplier = card.dataset.hourly === "false" ? 1 : (notSure ? 1 : hours);
      minimum += low * multiplier;
      maximum += high * multiplier;
    });
    var formatINR = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    });

    var hourlyUnspecified = notSure && cards.some(function (card) { return card.dataset.hourly !== "false"; });
    var amount = minimum === maximum ? formatINR.format(minimum) : formatINR.format(minimum) + "–" + formatINR.format(maximum);
    estimateTitle.textContent = hourlyUnspecified
      ? amount + " per hour; hours to be confirmed"
      : amount + (notSure ? " estimated service price" : " for " + hours + (hours === 1 ? " work hour" : " work hours"));
    estimateValue.value = estimateTitle.textContent + " (illustrative only; service discounts included where available)";
    agreementCopy.textContent = "I have reviewed this illustrative estimate and understand the final price will be confirmed in a written quotation. ";
    estimateTerms.value = "Accepted as a non-binding illustrative estimate";
    estimateCard.classList.remove("has-custom-service");
    estimateBadge.textContent = "ILLUSTRATIVE SAMPLE RATES";
    estimateDisclaimer.textContent = "Sample INR rates for demonstration only—not SimpleiTech's confirmed price or a binding quotation. Your final written quote will confirm scope and fees.";
    estimateCard.hidden = false;
  }

  function updateFindTimeAvailability() {
    var email = document.getElementById("consultation-email");
    var name = document.getElementById("consultation-name");
    var phone = document.getElementById("consultation-phone");
    var valid = name.value.trim().length >= 2 &&
      email.validity.valid &&
      phone.validity.valid &&
      agreement.checked;

    findTimeButton.disabled = !valid || submitting;
    document.getElementById("agreement-error").textContent = agreement.checked
      ? ""
      : (details.hidden ? "" : "Please acknowledge the " + (estimateCard.classList.contains("has-custom-service") ? "custom quotation terms" : "illustrative estimate") + " to continue.");
  }

  function resetBookingForEstimateChange() {
    if (details.hidden) return;

    agreement.checked = false;
    selectedSlot = null;
    selectedDate = null;
    slotPicker.hidden = true;
    slotSummary.hidden = true;
    bookingPanel.hidden = true;
    submitButton.disabled = true;
    findTimeButton.innerHTML = 'Find a time that works <i class="bx bx-calendar" aria-hidden="true"></i>';
    updateFindTimeAvailability();
  }

  function formatDateKey(dateKey, options) {
    var parts = dateKey.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", Object.assign({
      timeZone: CAL_TIME_ZONE
    }, options)).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)));
  }

  function getTodayKey() {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });
    return values.year + "-" + values.month + "-" + values.day;
  }

  function renderSlots(dateKey) {
    var slots = availableSlots[dateKey] || [];
    selectedDate = dateKey;
    selectedSlot = null;
    submitButton.disabled = true;
    slotOptions.textContent = "";
    slotPickerTitle.textContent = "Available times on " + formatDateKey(dateKey, {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    slotPicker.hidden = false;

    slots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "slot-option";
      button.textContent = new Intl.DateTimeFormat("en-IN", {
        timeZone: CAL_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(slot.start));
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        selectedSlot = slot;
        Array.prototype.forEach.call(slotOptions.children, function (item) {
          item.classList.remove("is-selected");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
        slotSummary.textContent = "Selected: " + formatDateKey(dateKey, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }) + " at " + button.textContent + " (India Standard Time)";
        slotSummary.hidden = false;
        submitButton.disabled = false;
        submitButton.focus();
      });
      slotOptions.appendChild(button);
    });
  }

  function renderCalendar() {
    var year = calendarMonthDate.getFullYear();
    var month = calendarMonthDate.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var currentMonthKey = year + "-" + String(month + 1).padStart(2, "0");
    var todayKey = getTodayKey();
    var currentMonth = todayKey.slice(0, 7);

    calendarMonth.textContent = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: CAL_TIME_ZONE
    }).format(new Date(Date.UTC(year, month, 15, 12)));
    document.getElementById("calendar-previous").disabled = currentMonthKey <= currentMonth;
    calendarDays.textContent = "";
    selectedDate = null;
    selectedSlot = null;
    slotPicker.hidden = true;
    slotSummary.hidden = true;
    submitButton.disabled = true;

    for (var empty = 0; empty < firstWeekday; empty += 1) {
      var spacer = document.createElement("span");
      spacer.className = "calendar-day-spacer";
      spacer.setAttribute("aria-hidden", "true");
      calendarDays.appendChild(spacer);
    }

    for (var day = 1; day <= daysInMonth; day += 1) {
      var dateKey = currentMonthKey + "-" + String(day).padStart(2, "0");
      var slots = availableSlots[dateKey] || [];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.textContent = String(day);
      button.disabled = slots.length === 0 || dateKey < todayKey;
      if (slots.length) {
        button.classList.add("has-availability");
        button.setAttribute("aria-label", formatDateKey(dateKey, {
          weekday: "long",
          day: "numeric",
          month: "long"
        }) + ", " + slots.length + " available times");
      } else {
        button.setAttribute("aria-label", formatDateKey(dateKey, {
          day: "numeric",
          month: "long"
        }) + ", unavailable");
      }
      button.addEventListener("click", function (key) {
        return function () {
          Array.prototype.forEach.call(calendarDays.children, function (item) {
            item.classList.remove("is-selected");
            item.setAttribute("aria-pressed", "false");
          });
          button.setAttribute("aria-pressed", "true");
          button.classList.add("is-selected");
          renderSlots(key);
        };
      }(dateKey));
      calendarDays.appendChild(button);
    }
  }

  async function loadAvailability() {
    var year = calendarMonthDate.getFullYear();
    var month = calendarMonthDate.getMonth();
    var start = year + "-" + String(month + 1).padStart(2, "0") + "-01";
    var lastDay = new Date(year, month + 1, 0).getDate();
    var end = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
    var params = new URLSearchParams({
      username: CAL_USER,
      eventTypeSlug: CAL_EVENT,
      start: start,
      end: end,
      timeZone: CAL_TIME_ZONE
    });

    calendarStatus.className = "calendar-status is-loading";
    calendarStatus.textContent = "Checking live availability…";
    document.getElementById("calendar-previous").disabled = true;
    document.getElementById("calendar-next").disabled = true;

    try {
      var response = await fetch(CAL_API + "/slots?" + params.toString(), {
        headers: { "cal-api-version": CAL_SLOTS_VERSION }
      });
      var data = await response.json();
      if (!response.ok || !data.data) {
        throw new Error(data.message || "Cal.com could not load availability.");
      }

      availableSlots = data.data;
      renderCalendar();
      var count = Object.keys(availableSlots).reduce(function (total, key) {
        return total + availableSlots[key].length;
      }, 0);
      calendarStatus.className = "calendar-status";
      calendarStatus.textContent = count
        ? count + " available times this month. Times shown in India Standard Time."
        : "No consultation times are available this month. Try another month or email sales@simpleitech.com.";
    } catch (error) {
      calendarDays.textContent = "";
      calendarStatus.className = "calendar-status is-error";
      calendarStatus.textContent = (error.message || "We couldn't load the calendar.") + " Please try again or book at cal.com/simpleitech/30min.";
    } finally {
      document.getElementById("calendar-previous").disabled = calendarMonthDate.getFullYear() + "-" + String(calendarMonthDate.getMonth() + 1).padStart(2, "0") <= getTodayKey().slice(0, 7);
      document.getElementById("calendar-next").disabled = false;
    }
  }

  function generateRequestNumber() {
    var day = getTodayKey().replace(/-/g, "");
    var random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    return "SIT-" + day + "-" + random[0].toString(36).toUpperCase().padStart(7, "0").slice(-7);
  }

  function selectedPaymentMethod() {
    var selected = form.querySelector('input[name="Preferred payment method"]:checked');
    return selected ? selected.value : "Not specified";
  }

  function buildBookingNotes(reference) {
    var workEstimate = duration.value === "not-sure" ? "Not sure yet" : duration.value + (duration.value === "1" ? " hour" : " hours");
    var notes = [
      "SimpleiTech consultation request: " + reference,
      "Requested services: " + serviceSummary.value,
      "Estimated follow-on work: " + workEstimate,
      "Illustrative planning estimate: " + estimateValue.value,
      "Final quotation and scope to be confirmed by SimpleiTech."
    ];
    var extra = document.getElementById("consultation-notes").value.trim();
    if (extra) notes.push("Client details: " + extra);
    return notes.join("\n");
  }

  function buildEmailMessage(reference, booking) {
    var workEstimate = duration.value === "not-sure" ? "Not sure yet" : duration.value + (duration.value === "1" ? " hour" : " hours");
    return [
      "SIMPLEITECH | NEW CONSULTATION REQUEST",
      "----------------------------------------",
      "Request number: " + reference,
      "Client: " + document.getElementById("consultation-name").value.trim(),
      "Email: " + document.getElementById("consultation-email").value.trim(),
      "Mobile: " + document.getElementById("consultation-phone").value.trim(),
      "Services: " + serviceSummary.value,
      "Estimated work: " + workEstimate,
      "Illustrative estimate: " + estimateValue.value,
      "Estimate acknowledgement: accepted",
      "Preferred payment method: " + selectedPaymentMethod(),
      "Requested consultation: " + new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: CAL_TIME_ZONE
      }).format(new Date(booking.start)),
      "Cal.com booking reference: " + (booking.uid || "See the Cal.com booking confirmation"),
      "Additional details: " + (document.getElementById("consultation-notes").value.trim() || "None provided"),
      "----------------------------------------",
      "The estimate is illustrative only. Confirm final scope and pricing with the client before starting paid work."
    ].join("\n");
  }

  async function refreshSelectedSlot() {
    var dateKey = selectedSlot.start.slice(0, 10);
    var params = new URLSearchParams({
      username: CAL_USER,
      eventTypeSlug: CAL_EVENT,
      start: dateKey,
      end: dateKey,
      timeZone: CAL_TIME_ZONE
    });
    var response = await fetch(CAL_API + "/slots?" + params.toString(), {
      headers: { "cal-api-version": CAL_SLOTS_VERSION }
    });
    var data = await response.json();
    if (!response.ok || !data.data) {
      throw new Error(data.message || "We couldn't verify that time. Please choose another slot.");
    }
    var daySlots = data.data[dateKey] || [];
    var freshSlot = daySlots.find(function (slot) {
      return new Date(slot.start).getTime() === new Date(selectedSlot.start).getTime();
    });
    if (!freshSlot) {
      throw new Error("That time has just been taken. Please choose another available slot.");
    }
    return freshSlot;
  }

  async function createBooking(reference, slot) {
    var payload = {
      eventTypeSlug: CAL_EVENT,
      username: CAL_USER,
      start: new Date(slot.start).toISOString(),
      attendee: {
        name: document.getElementById("consultation-name").value.trim(),
        email: document.getElementById("consultation-email").value.trim(),
        phoneNumber: document.getElementById("consultation-phone").value.trim(),
        timeZone: CAL_TIME_ZONE
      },
      bookingFieldsResponses: {
        notes: buildBookingNotes(reference)
      },
      metadata: {
        requestNumber: reference,
        services: serviceSummary.value,
        estimatedWorkHours: duration.value,
        illustrativeEstimate: estimateValue.value,
        estimateAccepted: "true"
      }
    };
    var response = await fetch(CAL_API + "/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cal-api-version": CAL_BOOKING_VERSION
      },
      body: JSON.stringify(payload)
    });
    var data = await response.json();
    if (!response.ok || !data.data) {
      throw new Error(data.message || "Cal.com couldn't book that time. Your request has not been submitted. Please choose another slot.");
    }
    return data.data;
  }

  async function sendRequestEmail(reference, booking) {
    document.getElementById("request-subject").value = "Consultation " + reference + " | " + document.getElementById("consultation-name").value.trim();
    document.getElementById("request-replyto").value = document.getElementById("consultation-email").value.trim();
    document.getElementById("request-email-message").value = buildEmailMessage(reference, booking);

    var response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    });
    var data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "The calendar booking succeeded, but we couldn't email the quotation request.");
    }
  }

  search.addEventListener("focus", function () {
    filterServices();
  });
  search.addEventListener("input", filterServices);
  search.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setSearchExpanded(false);
      return;
    }
    if (event.key === "ArrowDown" && !options.hidden) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === "ArrowUp" && !options.hidden) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion < 0 ? 0 : activeSuggestion - 1);
    } else if (event.key === "Enter" && !options.hidden && activeSuggestion >= 0) {
      event.preventDefault();
      options.querySelectorAll(".service-suggestion")[activeSuggestion].click();
    } else if (event.key === "Enter" && search.value.trim()) {
      event.preventDefault();
      if (matchingServices.length) {
        options.querySelector(".service-suggestion").click();
      } else {
        addCustomService();
      }
    } else if (event.key === "Tab" && search.value.trim() && !matchingServices.length) {
      event.preventDefault();
      addCustomService();
    }
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".service-picker-field")) setSearchExpanded(false);
  });

  serviceChoices.forEach(attachServiceChoice);
  duration.addEventListener("change", function () {
    updateSearchStatus();
    updateEstimate();
    resetBookingForEstimateChange();
  });

  proceedButton.addEventListener("click", function () {
    if (!selectedServices().length || !duration.value) return;
    details.hidden = false;
    stepProgress.hidden = false;
    updateProgress(2, false);
    setSearchExpanded(false);
    updateEstimate();
    stepProgress.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("consultation-name").focus({ preventScroll: true });
    updateFindTimeAvailability();
  });

  ["consultation-name", "consultation-email", "consultation-phone"].forEach(function (id) {
    var field = document.getElementById(id);
    field.addEventListener("input", updateFindTimeAvailability);
    field.addEventListener("change", updateFindTimeAvailability);
  });
  agreement.addEventListener("change", updateFindTimeAvailability);

  findTimeButton.addEventListener("click", function () {
    if (findTimeButton.disabled) return;
    bookingPanel.hidden = false;
    updateProgress(3, false);
    findTimeButton.disabled = true;
    findTimeButton.textContent = "Availability calendar below";
    calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
    loadAvailability();
    bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("calendar-previous").addEventListener("click", function () {
    if (calendarMonthDate.getFullYear() + "-" + String(calendarMonthDate.getMonth() + 1).padStart(2, "0") <= getTodayKey().slice(0, 7)) return;
    calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1);
    loadAvailability();
  });
  document.getElementById("calendar-next").addEventListener("click", function () {
    calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1);
    loadAvailability();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    result.className = "consultation-result";
    result.textContent = "";

    if (submitting) return;
    if (!selectedServices().length || !duration.value) {
      result.classList.add("is-error");
      result.textContent = "Choose at least one service and an estimated amount of work to continue.";
      search.focus();
      return;
    }
    if (details.hidden) {
      result.classList.add("is-error");
      result.textContent = "Complete your contact details and review the estimate before booking.";
      return;
    }
    if (!form.reportValidity()) return;
    if (!agreement.checked) {
      document.getElementById("agreement-error").textContent = "Please acknowledge the " + (estimateCard.classList.contains("has-custom-service") ? "custom quotation terms" : "illustrative estimate") + " to continue.";
      agreement.focus();
      return;
    }
    if (!selectedSlot) {
      result.classList.add("is-error");
      result.textContent = "Choose an available consultation time before submitting.";
      calendarStatus.focus();
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Confirming your time <span class="submit-spinner" aria-hidden="true"></span>';
    result.className = "consultation-result is-loading";
    result.textContent = "Verifying live availability and booking your 30-minute consultation…";

    if (!requestNumber) requestNumber = generateRequestNumber();

    try {
      var currentSlot = await refreshSelectedSlot();
      var booking = await createBooking(requestNumber, currentSlot);
      try {
        await sendRequestEmail(requestNumber, booking);
        result.className = "consultation-result is-success";
        result.textContent = "Booking confirmed. Your request number is " + requestNumber + ". A detailed request has been emailed to SimpleiTech; Cal.com will send your calendar invitation.";
      } catch (emailError) {
        result.className = "consultation-result is-error";
        result.textContent = "Your consultation is booked and your request number is " + requestNumber + ", but the quotation email could not be sent. Please email sales@simpleitech.com and include this request number.";
        console.error("Consultation booking succeeded, but its request email failed.", emailError);
      }
      submitButton.textContent = "Consultation booked";
      submitButton.disabled = true;
      findTimeButton.disabled = true;
      bookingPanel.classList.add("booking-complete");
      updateProgress(3, true);
    } catch (error) {
      result.className = "consultation-result is-error";
      result.textContent = (error.message || "We couldn't book your selected time.") + " Your request number is " + requestNumber + ". Please choose another slot and try again.";
      submitButton.disabled = !selectedSlot;
      submitButton.innerHTML = 'Try this time again <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>';
      console.error("Consultation booking failed.", error);
    } finally {
      submitting = false;
      updateSearchStatus();
      updateFindTimeAvailability();
    }
  });
})();
