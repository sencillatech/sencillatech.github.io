/* Lightweight interaction events for GA4. Never send form field values. */
(function () {
  if (typeof window.gtag !== 'function') return;

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (link) {
      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (error) {
        return;
      }

      var label = (link.innerText || link.getAttribute('aria-label') || link.title || '').trim().slice(0, 100);
      if (url.hostname !== window.location.hostname) {
        window.gtag('event', 'outbound_link_click', {
          link_url: url.href,
          link_domain: url.hostname,
          link_text: label
        });
      } else if (link.matches('[data-analytics-event], .btn, .cta, [role="button"]')) {
        window.gtag('event', 'cta_click', {
          link_url: url.href,
          link_text: label
        });
      }
    }

    var button = event.target.closest('button, input[type="button"], input[type="submit"]');
    if (button) {
      window.gtag('event', 'button_click', {
        button_id: button.id || '',
        button_text: (button.innerText || button.value || button.getAttribute('aria-label') || '').trim().slice(0, 100)
      });
    }
  });

  document.addEventListener('change', function (event) {
    var control = event.target;
    if (control.matches('input, select, textarea')) {
      window.gtag('event', 'form_interaction', {
        control_id: control.id || '',
        control_name: control.name || '',
        control_type: control.type || control.tagName.toLowerCase()
      });
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    window.gtag('event', 'form_submit', {
      form_id: form.id || '',
      form_name: form.getAttribute('name') || '',
      form_destination: form.action || window.location.href
    });
  }, true);
})();
