/* mt-persist v2026-09-17
 * Marketing stack persistence snippet. Paste into Webflow: Site settings > Custom code > Footer code,
 * wrapped in <script> tags. Implements appendix B section 5 of the docs.
 *
 * What it does:
 *  1. Stores first-touch attribution once (localStorage "mt_first").
 *  2. Overwrites last-touch attribution on every visit that carries UTMs (sessionStorage "mt_last").
 *  3. Reads the GA4 client id from the _ga cookie.
 *  4. Fills every hidden form input whose name matches a known key, on load and on focus.
 *  5. On form submit, stores the email/phone typed (localStorage "mt_contact") so later
 *     whatsapp_click / phone_click events can identify a known contact.
 *  6. Pushes cta_click / phone_click / whatsapp_click to the dataLayer with known_contact.
 * Never throws: every storage access is wrapped.
 */
(function () {
  'use strict';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_IDS = ['gclid', 'fbclid'];

  function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeSet(store, key, val) { try { store.setItem(key, val); } catch (e) { /* ignore */ } }
  function readJSON(store, key) { try { return JSON.parse(safeGet(store, key) || 'null'); } catch (e) { return null; } }
  function writeJSON(store, key, obj) { safeSet(store, key, JSON.stringify(obj)); }

  function parseQuery() {
    var out = {};
    try {
      var q = window.location.search.replace(/^\?/, '');
      if (!q) return out;
      q.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        var k = decodeURIComponent(kv[0] || '').toLowerCase();
        var v = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
        if (k) out[k] = v;
      });
    } catch (e) { /* ignore */ }
    return out;
  }

  function hasUtm(q) {
    for (var i = 0; i < UTM_KEYS.length; i++) if (q[UTM_KEYS[i]]) return true;
    return false;
  }

  function gaClientId() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
      if (!m) return '';
      var parts = decodeURIComponent(m[1]).split('.');
      return parts.length >= 4 ? parts.slice(2).join('.') : '';
    } catch (e) { return ''; }
  }

  var query = parseQuery();
  var nowIso = new Date().toISOString();

  // 1. First touch, written once.
  var first = readJSON(window.localStorage, 'mt_first');
  if (!first) {
    first = {
      utm_source: query.utm_source || '(direct)',
      utm_medium: query.utm_medium || '(none)',
      utm_campaign: query.utm_campaign || '',
      utm_content: query.utm_content || '',
      utm_term: query.utm_term || '',
      gclid: query.gclid || '',
      fbclid: query.fbclid || '',
      landing_page: window.location.pathname,
      referrer: document.referrer || '',
      first_seen_at: nowIso
    };
    writeJSON(window.localStorage, 'mt_first', first);
  } else {
    // Keep click ids fresh if a later visit carries them and the first visit did not.
    var changed = false;
    CLICK_IDS.forEach(function (k) { if (!first[k] && query[k]) { first[k] = query[k]; changed = true; } });
    if (changed) writeJSON(window.localStorage, 'mt_first', first);
  }

  // 2. Last touch, overwritten whenever UTMs are present.
  if (hasUtm(query)) {
    var last = {};
    UTM_KEYS.forEach(function (k) { last[k] = query[k] || ''; });
    writeJSON(window.sessionStorage, 'mt_last', last);
  }
  var lastTouch = readJSON(window.sessionStorage, 'mt_last') || {
    utm_source: '(direct)', utm_medium: '(none)', utm_campaign: '', utm_content: '', utm_term: ''
  };

  // 3. Build the field map.
  function fieldValues() {
    var v = {};
    UTM_KEYS.forEach(function (k) { v[k + '_first'] = first[k] || ''; v[k + '_last'] = lastTouch[k] || ''; });
    v.gclid = first.gclid || '';
    v.fbclid = first.fbclid || '';
    v.landing_page = first.landing_page || '';
    v.referrer = first.referrer || '';
    v.first_seen_at = first.first_seen_at || '';
    v.ga_client_id = gaClientId();
    v.page_url = window.location.href;
    return v;
  }

  // 4. Fill hidden inputs.
  function fillForms() {
    var vals = fieldValues();
    var inputs = document.querySelectorAll('form input[type="hidden"], form input[data-mt]');
    for (var i = 0; i < inputs.length; i++) {
      var name = (inputs[i].getAttribute('name') || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(vals, name)) inputs[i].value = vals[name];
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    fillForms();
    // GA cookie may be set after our first pass; retry once.
    setTimeout(fillForms, 1000);
    document.addEventListener('focusin', function (e) {
      if (e.target && e.target.form) fillForms();
    });

    // 5. Capture contact identifiers at submit time (before Webflow redirects).
    document.addEventListener('submit', function (e) {
      try {
        var f = e.target;
        if (!f || f.tagName !== 'FORM') return;
        var email = (f.querySelector('input[type="email"], input[name="email"]') || {}).value || '';
        var phone = (f.querySelector('input[type="tel"], input[name="phone"]') || {}).value || '';
        var formType = (f.querySelector('input[name="form_type"]') || {}).value || f.getAttribute('data-name') || '';
        if (email || phone) writeJSON(window.localStorage, 'mt_contact', { email: email.trim().toLowerCase(), phone: phone.trim(), form_type: formType, at: new Date().toISOString() });
      } catch (err) { /* ignore */ }
    }, true);

    // 6. Click events with known_contact.
    document.addEventListener('click', function (e) {
      try {
        var el = e.target && e.target.closest ? e.target.closest('a, button, [data-track]') : null;
        if (!el) return;
        var contact = readJSON(window.localStorage, 'mt_contact');
        var known = !!(contact && (contact.email || contact.phone));
        var href = (el.getAttribute('href') || '').toLowerCase();
        var track = (el.getAttribute('data-track') || '').toLowerCase();
        var ev = null;
        if (track === 'whatsapp' || href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) ev = 'whatsapp_click';
        else if (href.indexOf('tel:') === 0) ev = 'phone_click';
        else if (track === 'cta') ev = 'cta_click';
        if (!ev) return;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: ev,
          page_path: window.location.pathname,
          known_contact: known,
          cta_id: el.getAttribute('data-cta-id') || '',
          phone: ev === 'phone_click' ? href.replace('tel:', '') : '',
          contact_email: known ? contact.email : '',
          contact_phone: known ? contact.phone : ''
        });
      } catch (err) { /* ignore */ }
    }, true);
  });
})();
