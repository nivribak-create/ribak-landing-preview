// RIBAK landing page: the lead forms, the ad she came from, the order
// deadline, measurement, and the mobile dock. No dependencies.
(function () {
  'use strict';

  var CONFIG = {
    // Where a lead is sent. This is the CRM's public form endpoint.
    endpoint: 'https://blanchedalmond-yak-848858.hostingersite.com/api/public/lead',
    // Meta pixel id (digits only): the same pixel as ribakfood.co.il. Left empty, no pixel code is loaded.
    pixelId: '1464953784867877',
    // A creator's name is shown next to her quote only once Niv has approved it.
    showCreatorNames: false
  };

  // The ads that send traffic here. A visitor who arrives with ?ad_id=... sees,
  // at the top of the page, the sentence from the video she has just watched.
  var ADS = {
    '120253935192800236': { q: 'אני חוזרת הביתה ופשוט הכל מוכן לי, כמו שצריך.', by: 'מיקה שיין', img: 'assets/ad/b1.jpg', video: 'assets/video/ugc-1.mp4', poster: 'assets/video/ugc-1.jpg' },
    '120253935180300236': { q: 'במקום לארגן קופסאות, כל האוכל לכל השבוע.', by: 'מיקה שיין', img: 'assets/ad/b2.jpg', video: 'assets/video/ugc-4.mp4', poster: 'assets/video/ugc-4.jpg' },
    '120253935195690236': { q: 'הכי קל לי בעולם למדוד כמה חלבון, כמה קלוריות.', by: 'גליה סמסון', img: 'assets/ad/b3.jpg', video: 'assets/video/ugc-2.mp4', poster: 'assets/video/ugc-2.jpg' },
    '120253935197110236': { q: 'בסוף היום, ארוחות מאוזנות ובריאות.', by: 'גליה סמסון', img: 'assets/ad/b4.jpg', video: 'assets/video/ugc-3.mp4', poster: 'assets/video/ugc-3.jpg' }
  };

  var params = new URLSearchParams(location.search);
  // ?demo=1 shows the thank-you state without sending anything, for previews.
  var DEMO = params.get('demo') === '1';
  var AD_ID = (params.get('ad_id') || '').replace(/\D/g, '').slice(0, 32);

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
  function nextDelivery() {
    var n = israelNow();
    var daysToSunday = (7 - n.weekday) % 7 || 7;
    var closed = n.weekday > 3 || (n.weekday === 3 && n.hour >= 23);
    // Sunday itself still belongs to this week's cycle: next Sunday is 7 days off.
    if (closed && n.weekday !== 0) daysToSunday += 7;
    var d = new Date(Date.UTC(n.year, n.month - 1, n.day + daysToSunday));
    var months = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];
    var label = 'יום ראשון, ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()];
    // How the closing Wednesday reads from today.
    var closes = 'ביום רביעי ב־23:00';
    if (!closed && n.weekday === 3) closes = 'היום ב־23:00';
    else if (!closed && n.weekday === 2) closes = 'מחר ב־23:00';
    return { label: label, deadline: 'ההזמנות למשלוח של ' + label + ', נסגרות ' + closes + '.' };
  }

  try {
    var delivery = nextDelivery();
    document.querySelectorAll('[data-next-sunday]').forEach(function (el) { el.textContent = delivery.label; });
    document.querySelectorAll('[data-deadline]').forEach(function (el) { el.textContent = delivery.deadline; el.hidden = false; });
  } catch (e) { /* the page reads fine without the date */ }

  // When the call will really come, so nothing promises "today" at midnight
  // or on a Friday night.
  function callbackWhen() {
    var n = israelNow();
    if (n.weekday === 6 || (n.weekday === 5 && n.hour >= 15)) return 'sunday';
    if (n.hour >= 20) return 'tomorrow';
    return 'today';
  }
  var PROMISE = {
    today: ['נחזור אלייך עוד היום', 'נתקשר אלייך עוד היום.'],
    tomorrow: ['נחזור אלייך מחר', 'נתקשר אלייך מחר, לא בלילה.'],
    sunday: ['נחזור אלייך ביום ראשון', 'נתקשר אלייך ביום ראשון.']
  };
  function callbackPromise() { return PROMISE[callbackWhen()][1]; }
  // The line under the button makes the same promise the thank-you will keep.
  try {
    var linePromise = PROMISE[callbackWhen()][0];
    document.querySelectorAll('[data-callback]').forEach(function (el) { el.textContent = linePromise; });
  } catch (e) { /* the static "עוד היום" stays */ }

  // ---- phone ---------------------------------------------------------------
  function normalizePhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('972') === 0) d = '0' + d.slice(3);
    return /^05\d{8}$/.test(d) ? d : null;
  }

  // ---- where she came from --------------------------------------------------
  // An ad link carries ?ad_id=..., an influencer's link ?ref=name. Both are
  // passed to the CRM so a lead is credited to what brought her.
  function attribution() {
    var out = {};
    var ref = (params.get('ref') || '').trim().slice(0, 60);
    if (AD_ID) out.ad_id = AD_ID;
    if (ref) out.ref = ref;
    var utm = ['utm_source', 'utm_campaign', 'utm_content']
      .map(function (k) { return params.get(k) ? k.replace('utm_', '') + ': ' + params.get(k) : ''; })
      .filter(Boolean).join(' · ');
    out.notes = ('דף נחיתה' + (utm ? ' · ' + utm : '')).slice(0, 480);
    return out;
  }

  // ---- pixel ---------------------------------------------------------------
  // Not on a developer's own machine: previews there must not reach Meta's numbers.
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!LOCAL && /^\d{6,20}$/.test(CONFIG.pixelId)) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.pixelId);
    window.fbq('track', 'PageView');
  }

  // Two events for the middle of the funnel, each at most once per visit and
  // never in a preview: did she see the form, and did she start typing.
  var fired = {};
  function oncePerVisit(key) {
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return true;
    } catch (e) {
      if (fired[key]) return false;
      fired[key] = true;
      return true;
    }
  }
  function trackCustom(name) {
    if (DEMO || !window.fbq) return;
    if (!oncePerVisit('rbk_' + name)) return;
    window.fbq('trackCustom', name, AD_ID ? { ad_id: AD_ID } : {});
  }

  // ---- sending -------------------------------------------------------------
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

  // ---- forms ---------------------------------------------------------------
  var BUTTON = 'אני רוצה לנסות שבוע אחד';
  var forms = document.querySelectorAll('form[data-lead]');
  var dock = document.querySelector('[data-dock]');
  var sent = null; // what was sent, kept for the WhatsApp question on the thank-you

  function showDone(form, name) {
    form.querySelector('.tag__body').hidden = true;
    var done = form.querySelector('.tag__done');
    done.querySelector('[data-thanks]').textContent = 'קיבלנו, ' + name + '.';
    done.querySelector('[data-thanks-when]').textContent = callbackPromise();
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
  }

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
      el.addEventListener('input', function () {
        el.removeAttribute('aria-invalid');
        errEl.hidden = true;
        trackCustom('FormStart');
      });
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
      // The optional one-tap answers travel in the note the rep reads before calling.
      var tried = form.querySelector('input[name=tried]:checked');
      var when = form.querySelector('input[name=when]:checked');
      if (tried) payload.notes += ' · הזמינה בעבר ארוחות מוכנות: ' + tried.value;
      if (when) payload.notes += ' · נוח לה לדבר: ' + when.value;
      payload.notes = payload.notes.slice(0, 480);
      // Marketing messages are asked about on the thank-you, after she is in.
      payload.consent = false;
      // The bot trap. Its name must not be one a browser's autofill recognises
      // ("company" was, and real leads were dropped), and it stays empty for a person.
      payload.hp = form.elements.rbk_check.value;

      btn.disabled = true;
      btn.textContent = 'שולחת…';
      send(payload).then(function () {
        sent = payload;
        // One submission fills both forms, so the page never asks twice.
        forms.forEach(function (f) { showDone(f, name); });
        form.querySelector('.tag__done').focus();
        if (dock) dock.remove();
        // a preview submission (?demo=1) is not a lead and must not be counted as one
        if (window.fbq && !DEMO) window.fbq('track', 'Lead');
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = BUTTON;
        fail(null, 'הפרטים לא נשלחו. בדקי את החיבור לאינטרנט ונסי שוב.');
      });
    });

    // The one optional question, asked only after her details are in.
    var waYes = form.querySelector('[data-wa-yes]');
    if (waYes) waYes.addEventListener('click', function () {
      if (!sent) return;
      var again = {};
      Object.keys(sent).forEach(function (k) { again[k] = sent[k]; });
      again.consent = true;
      waYes.disabled = true;
      send(again).then(function () {
        document.querySelectorAll('[data-wa]').forEach(function (w) { w.textContent = 'נרשם. נשלח לך גם עדכונים בוואטסאפ.'; });
      }).catch(function () {
        waYes.disabled = false;
        waYes.textContent = 'לא נשמר. לנסות שוב';
      });
    });
  });

  // FormView: the first form is actually on her screen.
  if (forms.length && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { trackCustom('FormView'); seen.disconnect(); }
      });
    }, { threshold: 0.5 });
    seen.observe(forms[0]);
  }

  // ---- mobile dock: shown only while no form is on screen -------------------
  if (dock && 'IntersectionObserver' in window) {
    // It takes her to the form nearest to where she is, cursor already in it.
    dock.addEventListener('click', function (e) {
      var best = null, bestD = Infinity;
      forms.forEach(function (f) {
        var d = Math.abs(f.getBoundingClientRect().top);
        if (d < bestD) { bestD = d; best = f; }
      });
      if (!best) return;
      e.preventDefault();
      best.scrollIntoView({ block: 'center' });
      try { best.elements.name.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
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

  // ---- the ad she came from ---------------------------------------------------
  // A picture and her sentence only; the video itself is fetched when she taps.
  var ad = ADS[AD_ID];
  var adq = document.querySelector('[data-adq]');
  var player = document.querySelector('[data-player]');
  if (ad && adq) {
    adq.querySelector('[data-adq-img]').src = ad.img;
    adq.querySelector('[data-adq-q]').textContent = '״' + ad.q + '״';
    adq.querySelector('[data-adq-src]').textContent =
      (CONFIG.showCreatorNames ? ad.by + ', ' : '') + 'מהסרטון שראית. לחצי לצפייה.';
    adq.hidden = false;
    if (player) {
      var slot = player.querySelector('[data-player-slot]');
      var closePlayer = function () {
        slot.innerHTML = '';
        if (player.open && player.close) player.close(); else player.removeAttribute('open');
      };
      adq.addEventListener('click', function () {
        var v = document.createElement('video');
        v.src = ad.video;
        v.poster = ad.poster;
        v.controls = true;
        v.autoplay = true;
        v.setAttribute('playsinline', '');
        slot.innerHTML = '';
        slot.appendChild(v);
        if (player.showModal) player.showModal(); else player.setAttribute('open', '');
      });
      player.querySelector('[data-player-close]').addEventListener('click', closePlayer);
      player.addEventListener('close', function () { slot.innerHTML = ''; });
      player.addEventListener('click', function (e) { if (e.target === player) closePlayer(); });
    }
  }
})();
