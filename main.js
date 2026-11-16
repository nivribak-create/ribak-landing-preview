// RIBAK landing page: the two lead forms, the next delivery date, and the
// mobile dock. No dependencies.
(function () {
  'use strict';

  var CONFIG = {
    // Where a lead is sent. This is the CRM's public form endpoint.
    endpoint: 'https://blanchedalmond-yak-848858.hostingersite.com/api/public/lead',
    // Meta pixel id (digits only): the same pixel as ribakfood.co.il. Left empty, no pixel code is loaded.
    pixelId: '1464953784867877'
  };

  var params = new URLSearchParams(location.search);
  // ?demo=1 shows the thank-you state without sending anything, for previews.
  var DEMO = params.get('demo') === '1';
  // A preview link looks exactly like the real page, so it says out loud
  // that nothing typed into it reaches the CRM.
  if (DEMO) {
    var note = document.createElement('p');
    note.textContent = 'מצב בדיקה: מה שממלאים כאן לא נשלח ל-CRM.';
    note.setAttribute('role', 'status');
    note.style.cssText = 'margin:0;padding:8px 16px;background:#e5a93a;color:#0e3b2c;font-weight:800;font-size:15px;text-align:center;position:sticky;top:0;z-index:30';
    document.body.insertBefore(note, document.body.firstChild);
  }

  // ---- time in Israel, wherever the visitor's phone thinks it is ----------
  function israelNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem', hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', weekday: 'short'
    }).formatToParts(new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    return {
      year: +get('year'), month: +get('month'), day: +get('day'), hour: +get('hour'),
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
    };
  }

  // Orders for a Sunday close on the Wednesday before it at 23:00.
  function nextDeliverySunday() {
    var n = israelNow();
    var daysToSunday = (7 - n.weekday) % 7 || 7;
    var closed = n.weekday > 3 || (n.weekday === 3 && n.hour >= 23);
    // Sunday itself still belongs to this week's cycle: next Sunday is 7 days off.
    if (closed && n.weekday !== 0) daysToSunday += 7;
    var d = new Date(Date.UTC(n.year, n.month - 1, n.day + daysToSunday));
    var months = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];
    return 'יום ראשון, ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()];
  }

  try {
    var label = nextDeliverySunday();
    document.querySelectorAll('[data-next-sunday]').forEach(function (el) { el.textContent = label; });
  } catch (e) { /* the static "יום ראשון" stays */ }

  // When the call will really come, so the thank-you never promises "today"
  // at midnight or on a Friday night.
  function callbackWhen() {
    var n = israelNow();
    if (n.weekday === 6 || (n.weekday === 5 && n.hour >= 15)) return 'sunday';
    if (n.hour >= 20) return 'tomorrow';
    return 'today';
  }
  var PROMISE = {
    today: ['מתקשרים אלייך עוד היום.', 'נתקשר אלייך עוד היום.'],
    tomorrow: ['מתקשרים אלייך מחר, לא בלילה.', 'נתקשר אלייך מחר, לא בלילה.'],
    sunday: ['מתקשרים אלייך ביום ראשון.', 'נתקשר אלייך ביום ראשון.']
  };
  function callbackPromise() { return PROMISE[callbackWhen()][1]; }
  // The form's own title makes the same promise the thank-you will keep.
  try {
    var titlePromise = PROMISE[callbackWhen()][0];
    document.querySelectorAll('[data-callback]').forEach(function (el) { el.textContent = titlePromise; });
  } catch (e) { /* the static "עוד היום" stays */ }

  // ---- phone ---------------------------------------------------------------
  function normalizePhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('972') === 0) d = '0' + d.slice(3);
    return /^05\d{8}$/.test(d) ? d : null;
  }

  // ---- where she came from --------------------------------------------------
  // An ad link can carry ?ad_id=..., an influencer's link ?ref=name. Both are
  // passed to the CRM so a lead is credited to what brought her.
  function attribution() {
    var out = {};
    var ad = (params.get('ad_id') || '').replace(/\D/g, '').slice(0, 32);
    var ref = (params.get('ref') || '').trim().slice(0, 60);
    if (ad) out.ad_id = ad;
    if (ref) out.ref = ref;
    var utm = ['utm_source', 'utm_campaign', 'utm_content']
      .map(function (k) { return params.get(k) ? k.replace('utm_', '') + ': ' + params.get(k) : ''; })
      .filter(Boolean).join(' · ');
    out.notes = ('דף נחיתה' + (utm ? ' · ' + utm : '')).slice(0, 480);
    return out;
  }

  // ---- pixel ---------------------------------------------------------------
  if (/^\d{6,20}$/.test(CONFIG.pixelId)) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.pixelId);
    window.fbq('track', 'PageView');
  }

  // ---- forms ---------------------------------------------------------------
  // A weak mobile connection must not leave her staring at "שולחת…":
  // each try gets 12 seconds, and a failed network try is repeated once.
  function sendOnce(payload) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
    return fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) { var e = new Error('refused ' + r.status); e.refused = true; throw e; }
    }, function (e) { clearTimeout(timer); throw e; });
  }
  function send(payload) {
    if (DEMO) return new Promise(function (resolve) { setTimeout(resolve, 500); });
    return sendOnce(payload).catch(function (e) {
      if (e.refused) throw e;
      return sendOnce(payload);
    });
  }

  function showDone(form, name) {
    form.querySelector('.tag__body').hidden = true;
    var done = form.querySelector('.tag__done');
    done.querySelector('[data-thanks]').textContent = 'קיבלנו, ' + name + '.';
    done.querySelector('[data-thanks-when]').textContent = callbackPromise();
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
  }

  var forms = document.querySelectorAll('form[data-lead]');
  var dock = document.querySelector('[data-dock]');

  forms.forEach(function (form) {
    var nameEl = form.elements.name;
    var phoneEl = form.elements.phone;
    var errEl = form.querySelector('.tag__error');
    var btn = form.querySelector('button[type=submit]');

    // The message sits right under the field it is about, where her eyes
    // and the keyboard already are.
    function fail(el, msg) {
      errEl.textContent = msg;
      if (el) { el.closest('.field').after(errEl); el.setAttribute('aria-invalid', 'true'); el.focus(); }
      else btn.before(errEl);
      errEl.hidden = false;
    }
    [nameEl, phoneEl].forEach(function (el) {
      el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); errEl.hidden = true; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errEl.hidden = true;
      var name = nameEl.value.trim();
      var phone = normalizePhone(phoneEl.value);
      if (!name) return fail(nameEl, 'חסר שם. איך לפנות אלייך?');
      if (!phone) return fail(phoneEl, 'המספר לא נראה כמו נייד ישראלי. צריך 10 ספרות שמתחילות ב-05.');

      var payload = attribution();
      payload.name = name;
      payload.phone = phone;
      payload.consent = !!form.elements.consent.checked;
      // The bot trap. Its name must not be one a browser's autofill recognises
      // ("company" was, and real leads were dropped), and it stays empty for a person.
      payload.hp = form.elements.rbk_check.value;

      btn.disabled = true;
      btn.textContent = 'שולחת…';
      send(payload).then(function () {
        // One submission fills both tags, so the page never asks twice.
        forms.forEach(function (f) { showDone(f, name); });
        form.querySelector('.tag__done').focus();
        if (dock) dock.remove();
        // a preview submission (?demo=1) is not a lead and must not be counted as one
        if (window.fbq && !DEMO) window.fbq('track', 'Lead');
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = 'תתקשרו אליי';
        fail(null, 'הפרטים לא נשלחו. בדקי את החיבור לאינטרנט ונסי שוב.');
      });
    });
  });

  // ---- mobile dock: shown only while no form is on screen -------------------
  if (dock && 'IntersectionObserver' in window) {
    // It takes her to the form nearest to where she is, not always to the end.
    dock.addEventListener('click', function (e) {
      var best = null, bestD = Infinity;
      forms.forEach(function (f) {
        var d = Math.abs(f.getBoundingClientRect().top);
        if (d < bestD) { bestD = d; best = f; }
      });
      if (best) { e.preventDefault(); best.scrollIntoView({ block: 'start' }); }
    });
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visible.add(en.target) : visible.delete(en.target); });
      dock.setAttribute('data-show', visible.size === 0 ? 'true' : 'false');
    }, { threshold: 0.15 });
    forms.forEach(function (f) { io.observe(f); });
  }

  // ---- videos: starting one stops the other ---------------------------------
  var vids = document.querySelectorAll('.reels video');
  vids.forEach(function (v) {
    v.addEventListener('play', function () {
      vids.forEach(function (o) { if (o !== v) o.pause(); });
    });
  });
})();
