(function () {
  "use strict";

  var form = document.getElementById("consultation-form");
  if (!form) return;

  var search = document.getElementById("service-search");
  var serviceCards = Array.prototype.slice.call(document.querySelectorAll(".service-option"));
  var serviceChoices = Array.prototype.slice.call(document.querySelectorAll(".service-choice"));
  var serviceSummary = document.getElementById("selected-services");
  var searchStatus = document.getElementById("service-search-status");
  var result = document.getElementById("consultation-result");
  var submitButton = document.getElementById("consultation-submit");

  function selectedServices() {
    return serviceChoices.filter(function (choice) {
      return choice.checked;
    }).map(function (choice) {
      return choice.value;
    });
  }

  function updateServices() {
    var selected = selectedServices();
    serviceSummary.value = selected.join(", ");
    serviceChoices.forEach(function (choice) {
      choice.closest(".service-option").classList.toggle("is-selected", choice.checked);
    });
    searchStatus.textContent = selected.length
      ? selected.length + (selected.length === 1 ? " service selected" : " services selected")
      : serviceCards.filter(function (card) { return !card.hidden; }).length + " services available";
  }

  function filterServices() {
    var query = search.value.trim().toLowerCase();
    var visibleCount = 0;

    serviceCards.forEach(function (card) {
      var matches = !query || card.dataset.search.indexOf(query) !== -1;
      card.hidden = !matches && !card.querySelector(".service-choice").checked;
      if (!card.hidden) visibleCount += 1;
    });

    searchStatus.textContent = visibleCount
      ? visibleCount + (visibleCount === 1 ? " matching service" : " matching services")
      : "No matching services. Try a different search.";
  }

  search.addEventListener("input", filterServices);
  serviceChoices.forEach(function (choice) {
    choice.addEventListener("change", updateServices);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    result.className = "consultation-result";
    result.textContent = "";

    if (!selectedServices().length) {
      result.classList.add("is-error");
      result.textContent = "Please select at least one service so we can prepare your quotation.";
      search.focus();
      return;
    }

    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.innerHTML = 'Sending your request <span class="submit-spinner" aria-hidden="true"></span>';
    result.classList.add("is-loading");
    result.textContent = "Sending your quotation request securely…";

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Your request could not be sent. Please try again.");
        }
        return data;
      });
    }).then(function () {
      form.reset();
      updateServices();
      filterServices();
      result.className = "consultation-result is-success";
      result.textContent = "Thanks — your request is on its way. We'll review your requirements and email your quotation and payment instructions.";
    }).catch(function (error) {
      result.className = "consultation-result is-error";
      result.textContent = error.message || "We couldn't send your request. Please try again or email sales@simpleitech.com.";
    }).finally(function () {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Request my quotation <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>';
    });
  });
})();
