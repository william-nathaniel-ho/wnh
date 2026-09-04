/* =============================================================================
   WNH — shared site runtime
   No framework, no build step. Loaded by every page.
   ============================================================================= */
(function (global) {
  'use strict';

  var W = {};

  /* ---------------------------------------------------------------- base
     The site has to work both at a domain root (wnhdesign.io/) and under a
     repo subpath (user.github.io/wnh/). Root-absolute paths break the second
     case, so the base is derived from this script's own URL instead. */
  var BASE = (function () {
    var s = document.currentScript;
    if (!s) { var all = document.getElementsByTagName('script'); s = all[all.length - 1]; }
    var src = (s && s.src) || '';
    var i = src.indexOf('assets/js/site.js');
    if (i > -1) return src.slice(0, i);
    return location.pathname.replace(/[^/]*$/, '');
  })();
  W.base = BASE;
  W.url = function (p) { return BASE + String(p == null ? '' : p).replace(/^\//, ''); };

  /* ------------------------------------------------------------- helpers */
  W.$  = function (s, r) { return (r || document).querySelector(s); };
  W.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  W.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /* One typeface with a normal ampersand, so no glyph substitution. Kept as a
     named helper because every template calls it. */
  W.t = function (s) { return W.esc(s); };

  W.pad = function (n) { return String(n).padStart(2, '0'); };
  W.slugify = function (s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  /* the mark, inline so it inherits currentColor and costs no extra request */
  W.MARK = '<svg viewBox="0 0 193.99 86.03" role="img" aria-label="WNH" fill="currentColor">' +
    '<polygon points="133.06 12.67 133.06 73.36 117.97 76.35 117.97 67.5 93.49 43.01 93.49 21.69 117.97 46.17 117.97 9.68 133.06 12.67"/>' +
    '<polygon points="90.34 9.68 90.34 76.36 66.39 69.7 66.39 61.27 75.25 61.27 75.25 13.84 90.34 9.68"/>' +
    '<polygon points="63.24 17.02 63.24 68.82 39.3 62.16 39.3 61.27 48.15 61.27 48.15 21.21 63.24 17.02"/>' +
    '<polygon points="36.14 24.55 36.14 61.28 21.05 57.08 21.05 28.75 36.14 24.55"/>' +
    '<polygon points="172.94 20.58 172.94 65.26 170.5 65.94 170.48 65.95 157.86 68.45 157.86 50.56 136.22 50.56 136.22 35.47 157.86 35.47 157.86 17.58 172.94 20.58"/>' +
    '</svg>';

  var ARROW = '<svg width="13" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">' +
    '<path d="M9 1l4 4-4 4M13 5H0" stroke="currentColor" stroke-width="1.3"/></svg>';

  /* --------------------------------------------------------- cloudinary */
  var WIDTHS = [640, 960, 1440, 1920, 2560];
  W.cloud = '';

  W.cld = {
    ok: function (id) { return !!(id && String(id).trim() && W.cloud); },
    img: function (id, w) {
      return 'https://res.cloudinary.com/' + W.cloud +
             '/image/upload/f_auto,q_auto,c_limit,w_' + (w || 1440) + '/' + id;
    },
    srcset: function (id) {
      return WIDTHS.map(function (w) { return W.cld.img(id, w) + ' ' + w + 'w'; }).join(', ');
    },
    video: function (id) {
      return 'https://res.cloudinary.com/' + W.cloud + '/video/upload/f_auto,q_auto,vc_auto/' + id + '.mp4';
    },
    poster: function (id) {
      return 'https://res.cloudinary.com/' + W.cloud + '/video/upload/so_1,f_auto,q_auto,w_1600/' + id + '.jpg';
    }
  };

  /* -------------------------------------------------------------- vimeo */
  W.vimeoId = function (url) {
    var m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-z]+))?/i);
    return m ? { id: m[1], hash: m[2] || '' } : null;
  };
  W.vimeoSrc = function (url, autoplay) {
    var v = W.vimeoId(url);
    if (!v) return '';
    return 'https://player.vimeo.com/video/' + v.id + (v.hash ? '?h=' + v.hash + '&' : '?') +
           'title=0&byline=0&portrait=0&dnt=1&autopause=0' + (autoplay ? '&autoplay=1' : '');
  };

  /* a looping brand animation: no chrome, no sound, no controls */
  W.vimeoBg = function (url) {
    var v = W.vimeoId(url);
    if (!v) return '';
    return 'https://player.vimeo.com/video/' + v.id + (v.hash ? '?h=' + v.hash + '&' : '?') +
           'background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1';
  };

  /* a file path, a Cloudinary public id, or a Vimeo URL — decided by shape */
  W.loopSrc = function (src) {
    src = String(src || '').trim();
    if (!src) return null;
    if (/vimeo\.com/i.test(src)) return { kind: 'vimeo', url: src };
    if (/^https?:\/\//i.test(src) || /\.(mp4|webm|mov|m4v)$/i.test(src)) {
      return { kind: 'file', url: /^https?:\/\//i.test(src) ? src : W.url(src) };
    }
    return W.cld.ok(src) ? { kind: 'file', url: W.cld.video(src), poster: W.cld.poster(src) } : null;
  };

  /* mount a loop into a box. the static mark holds the space from the first
     paint, so nothing is ever blank; the motion fades in once it can play.
     under reduced motion nothing starts on its own — the visitor presses play. */
  W.loop = function (box, conf, title) {
    if (!box) return false;
    if (typeof conf === 'string') conf = { src: conf };
    conf = conf || {};
    var src = W.loopSrc(conf.src || conf.vimeo);
    if (!src) return false;

    box.classList.add('is-loop');
    box.innerHTML = '';

    /* the holding frame takes the film's own ground colour, so the panel never
       flashes paper-white before a dark loop arrives */
    if (conf.bg) {
      box.style.setProperty('--loop-bg', conf.bg);
      var hex = String(conf.bg).replace('#', '');
      if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
      if (/^[0-9a-f]{6}$/i.test(hex)) {
        var n = parseInt(hex, 16);
        var lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
        if (lum < 0.5) box.classList.add('is-dark');
      }
    }

    var still = document.createElement('div');
    still.className = 'loop-still';
    still.innerHTML = conf.poster
      ? '<img alt="" src="' + W.esc(W.cld.ok(conf.poster) ? W.cld.img(conf.poster, 720) : W.url(conf.poster)) + '">'
      : W.MARK;
    box.appendChild(still);

    var ready = function () { box.classList.add('is-ready'); };

    if (src.kind === 'file') {
      var v = document.createElement('video');
      v.className = 'loop-media';
      v.src = src.url;
      if (src.poster) v.poster = src.poster;
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.preload = W.reduce ? 'metadata' : 'auto';
      /* nothing autoplays under reduced motion: hand over the real controls,
         and drop the still so it cannot sit on top of them */
      if (W.reduce) { v.controls = true; still.remove(); ready(); }
      else { v.autoplay = true; v.addEventListener('playing', ready, { once: true });
             v.addEventListener('loadeddata', ready, { once: true }); }
      v.addEventListener('error', function () { box.classList.remove('is-ready'); });
      box.appendChild(v);
      return true;
    }

    /* Vimeo: a player is ~300KB of chrome before the first frame, so the mark
       stays put until the embed reports it has loaded */
    var mount = function (autoplay) {
      var f = document.createElement('iframe');
      f.className = 'loop-media';
      f.title = title || 'Motion';
      f.setAttribute('frameborder', '0');
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.addEventListener('load', function () { setTimeout(ready, 400); });
      if (autoplay) {
        f.src = W.vimeoBg(src.url);
        f.setAttribute('tabindex', '-1');
        f.setAttribute('aria-hidden', 'true');
      } else {
        f.src = W.vimeoSrc(src.url, true);
      }
      return f;
    };

    if (W.reduce) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'loop-play';
      b.innerHTML = '<span class="play" aria-hidden="true">&#9654;</span>';
      b.setAttribute('aria-label', 'Play ' + (title || 'motion'));
      b.addEventListener('click', function () { box.innerHTML = ''; box.appendChild(mount(false)); ready(); });
      still.appendChild(b);
    } else {
      box.appendChild(mount(true));
    }
    return true;
  };

  /* -------------------------------------------------------------- media */
  W.cover = function (p, i, w) {
    var c = p.cover || {};
    if (W.cld.ok(c.src)) {
      return '<img src="' + W.cld.img(c.src, w || 960) + '" srcset="' + W.cld.srcset(c.src) +
             '" sizes="(max-width:760px) 92vw, (max-width:1180px) 46vw, 34vw" alt="' +
             W.esc(c.alt || p.title) + '" loading="lazy" decoding="async">';
    }
    return '<div class="ph" data-tone="' + W.esc(p.tone || 'wine') + '">' +
           '<span class="num">' + W.pad((i || 0) + 1) + '</span></div>';
  };

  /* Bento spans on a six-column grid. The pattern has period six and each row
     sums to six, so it tiles cleanly — and the last card is widened to fill
     whatever is left of its row, so an odd project count never ends on a hole. */
  var SPAN_PATTERN = ['wide', '', 'half', 'half', 'wide', ''];
  var SPAN_W = { '': 2, half: 3, wide: 4, full: 6 };

  W.spans = function (n) {
    var out = [], row = 0;
    for (var i = 0; i < n; i++) {
      var s = SPAN_PATTERN[i % SPAN_PATTERN.length];
      if (row + SPAN_W[s] > 6) row = 0;
      out.push(s);
      row = (row + SPAN_W[s]) % 6;
    }
    if (n && row > 0) {
      var need = SPAN_W[out[n - 1]] + (6 - row);
      out[n - 1] = need >= 6 ? 'full' : need >= 4 ? 'wide' : need === 3 ? 'half' : '';
    }
    return out;
  };

  W.tags = function (list, onInk) {
    return '<span class="tags">' + (list || []).map(function (x) {
      return '<span class="tag' + (onInk ? ' tag-ink' : '') + '">' + W.esc(x) + '</span>';
    }).join('') + '</span>';
  };

  /* --------------------------------------------------------------- data */
  W.load = function () {
    return fetch(W.url('content.json'), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('content.json ' + r.status); return r.json(); })
      .then(function (d) {
        W.data = d;
        W.cloud = (d.site && d.site.cloudinary && d.site.cloudinary.cloud) || '';
        return d;
      });
  };
  W.projects = function () { return (W.data && W.data.projects) || []; };
  W.project = function (slug) {
    return W.projects().filter(function (p) { return p.slug === slug; })[0] || null;
  };
  W.sectors = function () {
    var seen = {}, out = [];
    W.projects().forEach(function (p) {
      if (p.sector && !seen[p.sector]) { seen[p.sector] = 1; out.push(p.sector); }
    });
    return out;
  };
  /* A filter that returns one result is not a filter. min defaults to 1 so
     other pages are unaffected; the work index passes 2. */
  W.disciplines = function (min) {
    var count = {};
    W.projects().forEach(function (p) {
      (p.disciplines || []).forEach(function (d) { count[d] = (count[d] || 0) + 1; });
    });
    return Object.keys(count).filter(function (d) { return count[d] >= (min || 1); }).sort();
  };

  /* -------------------------------------------------------------- shell
     Nav and footer are injected rather than copy-pasted into five files, so
     a nav change is one edit. */
  W.shell = function () {
    var nav = W.$('#shell-nav');
    if (nav) nav.innerHTML =
      '<header class="nav"><div class="nav-in">' +
        '<a class="brand" href="' + W.url('') + '" aria-label="WNH — home">' + W.MARK +
          '<span class="sub lab">Design &amp; Production</span></a>' +
        '<nav class="nav-links" aria-label="Primary">' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a>' +
        '</nav>' +
        '<button class="pill nav-cta" data-contact>Start a project ' + ARROW + '</button>' +
        '<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="sheet">' +
          '<i></i><i></i><i></i></button>' +
      '</div></header>' +
      '<div class="sheet" id="sheet">' +
        '<nav aria-label="Mobile">' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a>' +
          '<a href="' + W.url('#contact') + '">Contact</a></nav>' +
        '<div class="sheet-foot lab"><span data-mail></span><span data-locations></span></div>' +
      '</div>';

    var foot = W.$('#shell-foot');
    if (foot) foot.innerHTML =
      '<footer><div class="wrap"><div class="foot-grid foot-3">' +
        '<div class="foot-col"><h4>Studio</h4><p data-full></p><p data-locations></p></div>' +
        '<div class="foot-col"><h4>Index</h4>' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a></div>' +
        '<div class="foot-col"><h4>Contact</h4>' +
          '<a data-mail data-mailto href="#"></a>' +
          '<button class="foot-btn" data-contact>Start a project</button></div>' +
      '</div><div class="foot-bot lab">' +
        '<span>&copy; <span data-year></span> WNH</span><span data-locations></span>' +
      '</div></div></footer>';
  };

  /* any static link written as data-href="work/" is resolved against the base */
  W.links = function () {
    W.$$('[data-href]').forEach(function (a) { a.href = W.url(a.dataset.href); });
  };

  /* content-driven bits of the chrome */
  W.chrome = function (d) {
    var s = (d && d.site) || {};
    var mail = s.email || '';
    var subject = encodeURIComponent('Project enquiry — ' + (s.name || 'WNH'));

    W.$$('[data-mail]').forEach(function (el) { el.textContent = mail; });
    W.$$('[data-mailto]').forEach(function (el) { el.href = 'mailto:' + mail + '?subject=' + subject; });
    W.$$('[data-locations]').forEach(function (el) { el.textContent = (s.locations || []).join(' / '); });
    W.$$('[data-full]').forEach(function (el) { el.innerHTML = W.t(s.full || ''); });
    W.$$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  };

  /* --------------------------------------------------------------- menu */
  W.menu = function () {
    var burger = W.$('#burger');
    if (!burger) return;
    var set = function (open) {
      document.body.classList.toggle('menu', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', function () { set(!document.body.classList.contains('menu')); });
    W.$$('#sheet a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu')) { set(false); burger.focus(); }
    });
  };

  /* ------------------------------------------------------------- reveal */
  W.reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  W.reveal = function () {
    var items = W.$$('.rv');
    if (W.reduce || !('IntersectionObserver' in global)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        /* an element jumped clean past the viewport still has to appear, or a
           fast scroll leaves content permanently invisible */
        if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
        var sibs = Array.prototype.slice.call(e.target.parentNode.children);
        e.target.style.transitionDelay = (Math.min(sibs.indexOf(e.target), 8) * 60) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });

    var busy = false;
    var sweep = function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () {
        busy = false;
        W.$$('.rv:not(.in)').forEach(function (el) {
          if (el.getBoundingClientRect().top < global.innerHeight * 0.94) {
            el.classList.add('in'); io.unobserve(el);
          }
        });
      });
    };
    global.addEventListener('scroll', sweep, { passive: true });
    global.addEventListener('resize', sweep, { passive: true });
    sweep();
  };

  /* the nav only gains its backdrop once the page has moved */
  W.meters = function () {
    var on = false;
    var check = function () {
      var should = global.scrollY > 24;
      if (should !== on) { on = should; document.body.classList.toggle('scrolled', on); }
    };
    check();
    global.addEventListener('scroll', function () { requestAnimationFrame(check); }, { passive: true });
  };

  /* A row of images whose shapes do not match. Equal columns leave a 16:9
     shot floating in a 4:3 box with dead space under it, and a fixed crop
     throws away the part of the picture that mattered. So: widths in
     proportion to each image's own ratio, which makes every height in the row
     identical and the row exactly as wide as the column. Ratios come from the
     value stored at upload where there is one, and from the loaded image where
     there is not — and a stored ratio that turns out to be wrong is corrected
     the moment the real image arrives. */
  W.justify = function (root) {
    W.$$('.blk-images .media', root).forEach(function (box) {
      var img = box.querySelector('img');
      if (!img) return;
      var fit = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return;
        var real = w / h, had = parseFloat(box.style.getPropertyValue('--ar'));
        if (!had || Math.abs(had - real) / real > 0.02) {
          box.style.setProperty('--ar', real.toFixed(4));
        }
      };
      if (img.complete) fit(); else img.addEventListener('load', fit, { once: true });
    });
  };

  /* click-to-load Vimeo, so one page never pulls four players at once */
  W.facades = function () {
    W.$$('.embed[data-vimeo]').forEach(function (box) {
      var facade = box.querySelector('.embed-facade');
      if (!facade) return;
      facade.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = W.vimeoSrc(box.dataset.vimeo, true);
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.setAttribute('allowfullscreen', '');
        f.title = box.dataset.title || 'Video';
        box.innerHTML = '';
        box.appendChild(f);
      });
    });
  };


  /* ------------------------------------------------------------- enquiry
     A real form rather than a mailto: most people never finish a mailto —
     it opens a client they may not use. Posts to site.contact.endpoint
     (a Formspree URL or any endpoint that accepts JSON); with no endpoint
     set it falls back to composing the mail, so the button always works. */
  W.contact = function (d) {
    var s = (d && d.site) || {};
    var c = s.contact || {};
    var mail = s.email || '';

    var dlg = document.createElement('dialog');
    dlg.className = 'sheet-dlg';
    dlg.innerHTML =
      '<form method="dialog" class="enq" novalidate>' +
        '<button class="enq-x" value="cancel" aria-label="Close">' +
          '<svg width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
          '<path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.4"/></svg></button>' +
        '<div class="lab">Start a project</div>' +
        '<h2>Tell me what you\'re making.</h2>' +
        '<p class="enq-note">' + W.esc(c.note || '') + '</p>' +
        '<div class="enq-f"><label for="enq-name">Name</label>' +
          '<input id="enq-name" name="name" type="text" autocomplete="name" required></div>' +
        '<div class="enq-f"><label for="enq-email">Email</label>' +
          '<input id="enq-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="enq-f"><label for="enq-msg">Message</label>' +
          '<textarea id="enq-msg" name="message" rows="5" required></textarea></div>' +
        '<div class="enq-hp" aria-hidden="true">' +
          '<label>Leave this empty<input name="company" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="enq-err" role="alert"></div>' +
        '<div class="enq-act">' +
          '<button type="submit" class="pill pill-solid enq-send">Send</button>' +
          '<a class="enq-alt" href="mailto:' + W.esc(mail) + '">or email directly</a>' +
        '</div>' +
      '</form>' +
      '<div class="enq-done" hidden>' +
        '<div class="lab">Sent</div>' +
        '<h2>Thanks — I\'ll come back to you.</h2>' +
        '<p class="enq-note">Usually within two working days.</p>' +
        '<button class="pill enq-close">Close</button>' +
      '</div>';
    document.body.appendChild(dlg);

    var form = dlg.querySelector('.enq');
    var err = dlg.querySelector('.enq-err');
    var send = dlg.querySelector('.enq-send');

    var open = function () {
      err.textContent = '';
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      var f = dlg.querySelector('#enq-name');
      if (f) setTimeout(function () { f.focus(); }, 40);
    };
    var close = function () {
      if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    };

    W.$$('[data-contact]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
    dlg.querySelector('.enq-x').addEventListener('click', function (e) { e.preventDefault(); close(); });
    dlg.querySelector('.enq-close').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        message: form.message.value.trim()
      };
      if (form.company.value) return;                    /* honeypot */
      if (!data.name || !data.email || !data.message) {
        err.textContent = 'Name, email and a message, please.'; return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        err.textContent = 'That email address does not look right.'; return;
      }

      if (!c.endpoint) {
        /* no endpoint configured — hand it to the mail client with the
           fields already filled, so nothing the person typed is lost */
        location.href = 'mailto:' + mail +
          '?subject=' + encodeURIComponent('Project enquiry — ' + data.name) +
          '&body=' + encodeURIComponent(data.message + '\n\n— ' + data.name + ' (' + data.email + ')');
        return;
      }

      send.disabled = true; send.textContent = 'Sending…';
      fetch(c.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('Send failed (' + r.status + ')');
        form.hidden = true;
        dlg.querySelector('.enq-done').hidden = false;
        dlg.querySelector('.enq-close').focus();
      }).catch(function (e2) {
        err.textContent = e2.message + ' — you can email directly instead.';
      }).finally(function () {
        send.disabled = false; send.textContent = 'Send';
      });
    });
  };

  W.boot = function (render) {
    W.shell();
    W.links();
    W.menu();
    W.load().then(function (d) {
      W.chrome(d);
      if (render) render(d);
      W.contact(d);
      W.reveal();
      W.meters();
      W.facades();
      document.body.classList.add('loaded');
    }).catch(function (err) {
      console.error('WNH: could not load content.json', err);
      document.body.classList.add('loaded');
    });
  };

  global.WNH = W;
})(window);
