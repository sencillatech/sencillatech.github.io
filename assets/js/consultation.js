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

  var search = document.getElementById("service-search");
  var options = document.getElementById("service-options");
  var serviceCards = Array.prototype.slice.call(document.querySelectorAll(".service-option"));
  var serviceChoices = Array.prototype.slice.call(document.querySelectorAll(".service-choice"));
  var duration = document.getElementById("consultation-duration");
  var details = document.getElementById("consultation-details");
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

  function selectedServices() {
    return serviceChoices.filter(function (choice) {
      return choice.checked;
    });
  }

  function setSearchExpanded(expanded) {
    options.hidden = !expanded;
    search.setAttribute("aria-expanded", String(expanded));
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
    var visible = serviceCards.filter(function (card) {
      return !card.hidden;
    }).length;

    searchStatus.textContent = selected.length
      ? selected.length + (selected.length === 1 ? " service selected" : " services selected") + " · search to add more"
      : (search.value.trim() ? visible + " matching services" : "Choose one or more services");
    serviceSummary.value = selected.join(", ");
    proceedButton.disabled = selected.length === 0 || !duration.value || submitting;
  }

  function filterServices() {
    var query = search.value.trim().toLowerCase();
    var visibleCount = 0;

    serviceCards.forEach(function (card) {
      var choice = card.querySelector(".service-choice");
      var matches = !query || card.dataset.search.indexOf(query) !== -1;
      card.hidden = !matches && !choice.checked;
      card.classList.toggle("is-selected", choice.checked);
      if (!card.hidden) visibleCount += 1;
    });

    if (query) setSearchExpanded(true);
    if (!visibleCount && query) {
      searchStatus.textContent = "No matching services. Try another search.";
    } else {
      updateSearchStatus();
    }
  }

  function updateEstimate() {
    var selected = selectedServices();
    var hours = Number(duration.value);
    if (!selected.length || !hours) {
      estimateCard.hidden = true;
      estimateValue.value = "";
      return;
    }

    var rates = selected.map(function (choice) {
      return Number(choice.closest(".service-option").dataset.rate);
    });
    var minimum = Math.min.apply(Math, rates) * hours;
    var maximum = Math.max.apply(Math, rates) * hours;
    var formatINR = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    });

    estimateTitle.textContent = minimum === maximum
      ? formatINR.format(minimum) + " for " + hours + (hours === 1 ? " work hour" : " work hours")
      : formatINR.format(minimum) + "–" + formatINR.format(maximum) + " for " + hours + (hours === 1 ? " work hour" : " work hours");
    estimateValue.value = estimateTitle.textContent + " (illustrative only)";
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
      : (details.hidden ? "" : "Please acknowledge the illustrative estimate to continue.");
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
    var notes = [
      "SimpleiTech consultation request: " + reference,
      "Requested services: " + serviceSummary.value,
      "Estimated follow-on work: " + duration.value + " hour(s)",
      "Illustrative planning estimate: " + estimateValue.value,
      "Final quotation and scope to be confirmed by SimpleiTech."
    ];
    var extra = document.getElementById("consultation-notes").value.trim();
    if (extra) notes.push("Client details: " + extra);
    return notes.join("\n");
  }

  function buildEmailMessage(reference, booking) {
    return [
      "SIMPLEITECH | NEW CONSULTATION REQUEST",
      "----------------------------------------",
      "Request number: " + reference,
      "Client: " + document.getElementById("consultation-name").value.trim(),
      "Email: " + document.getElementById("consultation-email").value.trim(),
      "Mobile: " + document.getElementById("consultation-phone").value.trim(),
      "Services: " + serviceSummary.value,
      "Estimated work: " + duration.value + " hour(s)",
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
    setSearchExpanded(true);
    filterServices();
  });
  search.addEventListener("input", filterServices);
  search.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setSearchExpanded(false);
      search.blur();
    }
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".service-picker-field")) setSearchExpanded(false);
  });

  serviceChoices.forEach(function (choice) {
    choice.addEventListener("change", function () {
      renderSelectedServices();
      search.value = "";
      filterServices();
      updateSearchStatus();
      updateEstimate();
      resetBookingForEstimateChange();
      updateFindTimeAvailability();
    });
  });
  duration.addEventListener("change", function () {
    updateSearchStatus();
    updateEstimate();
    resetBookingForEstimateChange();
  });

  proceedButton.addEventListener("click", function () {
    if (!selectedServices().length || !duration.value) return;
    details.hidden = false;
    setSearchExpanded(false);
    updateEstimate();
    details.scrollIntoView({ behavior: "smooth", block: "start" });
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
      document.getElementById("agreement-error").textContent = "Please acknowledge the illustrative estimate to continue.";
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
