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

  /* ---------------------------------------------------------------- helpers */
  W.$  = function (s, r) { return (r || document).querySelector(s); };
  W.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  W.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Swap every ampersand for the serif italic form. Applied after escaping,
     so it matches the entity Wesc produces, not a raw & in user copy. */
  W.amp = function (html) {
    return String(html).replace(/&amp;/g, '<span class="amp">&amp;</span>');
  };

  /* escape + prettify ampersands in one call — use for all display strings */
  W.t = function (s) { return W.amp(W.esc(s)); };

  W.pad = function (n) { return String(n).padStart(2, '0'); };
  W.slugify = function (s) {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  /* ------------------------------------------------------------- cloudinary */
  var WIDTHS = [640, 960, 1440, 1920, 2560];
  W.cloud = '';                       /* set from content.json at load */

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

  /* ------------------------------------------------------------------ vimeo */
  W.vimeoId = function (url) {
    var m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-z]+))?/i);
    return m ? { id: m[1], hash: m[2] || '' } : null;
  };
  W.vimeoSrc = function (url, autoplay) {
    var v = W.vimeoId(url);
    if (!v) return '';
    return 'https://player.vimeo.com/video/' + v.id +
           (v.hash ? '?h=' + v.hash + '&' : '?') +
           'title=0&byline=0&portrait=0&dnt=1&autopause=0' +
           (autoplay ? '&autoplay=1' : '');
  };

  /* ------------------------------------------------------------------ media */
  /* A cover renders three ways, in order of what's actually available:
     a Cloudinary image, a Vimeo thumbnail-less tinted tile, or a generated
     stand-in — so the site never shows a broken box before assets land. */
  W.cover = function (p, i, w) {
    var c = p.cover || {};
    if (W.cld.ok(c.src)) {
      return '<img src="' + W.cld.img(c.src, w || 960) + '" srcset="' + W.cld.srcset(c.src) +
             '" sizes="(max-width:640px) 90vw, (max-width:1100px) 45vw, 30vw" alt="' +
             W.esc(c.alt || p.title) + '" loading="lazy" decoding="async" ' +
             'style="width:100%;height:100%;object-fit:cover">';
    }
    return '<div class="ph" data-tone="' + W.esc(p.tone || 'wine') + '">' +
           '<span class="num">' + W.pad((i || 0) + 1) + '</span></div>';
  };

  W.tags = function (list) {
    return '<span class="tags">' + (list || []).map(function (x) {
      return '<span class="tag">' + W.esc(x) + '</span>';
    }).join('') + '</span>';
  };

  /* ------------------------------------------------------------------- data */
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
  W.disciplines = function () {
    var seen = {}, out = [];
    W.projects().forEach(function (p) {
      (p.disciplines || []).forEach(function (d) { if (!seen[d]) { seen[d] = 1; out.push(d); } });
    });
    return out.sort();
  };

  /* ------------------------------------------------------------------ chrome */
  W.chrome = function (d) {
    var s = (d && d.site) || {};
    var mail = s.email || '';
    var subject = encodeURIComponent('Project enquiry — ' + (s.name || 'WNH'));

    W.$$('[data-mail]').forEach(function (el) {
      el.textContent = mail;
      if (el.tagName === 'A') el.href = 'mailto:' + mail + '?subject=' + subject;
    });
    W.$$('[data-mailto]').forEach(function (el) { el.href = 'mailto:' + mail + '?subject=' + subject; });
    W.$$('[data-locations]').forEach(function (el) { el.textContent = (s.locations || []).join(' / '); });
    W.$$('[data-full]').forEach(function (el) { el.innerHTML = W.t(s.full || ''); });
    W.$$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    var social = W.$('[data-social]');
    if (social) {
      social.innerHTML = '<h4>Elsewhere</h4>' + (s.social || []).map(function (l) {
        return '<a href="' + W.esc(l.url) + '" rel="noopener">' + W.esc(l.label) + '</a>';
      }).join('');
    }
  };

  /* mobile menu */
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

  /* reveal on scroll */
  W.reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  W.reveal = function () {
    var items = W.$$('.rv');
    if (W.reduce || !('IntersectionObserver' in global)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        /* an element jumped clean past the viewport still has to appear,
           or a fast scroll leaves content permanently invisible */
        if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
        var sibs = Array.prototype.slice.call(e.target.parentNode.children);
        e.target.style.transitionDelay = (Math.min(sibs.indexOf(e.target), 8) * 55) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });

    var busy = false;
    var sweep = function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () {
        busy = false;
        W.$$('.rv:not(.in)').forEach(function (el) {
          if (el.getBoundingClientRect().top < global.innerHeight * 0.92) {
            el.classList.add('in'); io.unobserve(el);
          }
        });
      });
    };
    global.addEventListener('scroll', sweep, { passive: true });
    global.addEventListener('resize', sweep, { passive: true });
    sweep();
  };

  /* scroll-linked timecode + dual clocks */
  W.meters = function () {
    var tc = W.$('#tc'), ftc = W.$('#f-tc'), loc = W.$('#loc');
    if (tc || ftc) {
      var frames = function () {
        var max = Math.max(1, document.documentElement.scrollHeight - global.innerHeight);
        var total = Math.round(Math.min(1, Math.max(0, global.scrollY / max)) * 24 * 138);
        var out = '00:' + W.pad(Math.floor(total / 1440)) + ':' +
                  W.pad(Math.floor(total / 24) % 60) + ':' + W.pad(total % 24);
        if (tc) tc.textContent = out;
        if (ftc) ftc.textContent = out;
      };
      frames();
      global.addEventListener('scroll', function () { requestAnimationFrame(frames); }, { passive: true });
    }
    if (loc) {
      var zone = function (tz) {
        try {
          return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
            .format(new Date());
        } catch (e) { return '--:--'; }
      };
      var tick = function () { loc.textContent = 'PER ' + zone('Australia/Perth') + ' / HKG ' + zone('Asia/Hong_Kong'); };
      tick(); setInterval(tick, 30000);
    }
  };

  /* click-to-load Vimeo, so an embed page doesn't pull four players on load */
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


  /* ------------------------------------------------------------------ shell
     Nav and footer are injected rather than copy-pasted into five files, so
     a nav change is one edit. Everything here is static markup — content.json
     only fills in the email, locations and social links afterwards. */
  W.shell = function () {
    var nav = W.$('#shell-nav');
    if (nav) nav.innerHTML =
      '<header class="nav"><div class="nav-in">' +
        '<a class="brand" href="' + W.url('') + '" aria-label="WNH — home">' +
          '<span class="dot" aria-hidden="true"></span><b>WNH</b>' +
          '<span class="mono muted" style="letter-spacing:.18em">Design <span class="amp">&amp;</span> Production</span>' +
        '</a>' +
        '<div class="nav-status mono muted" aria-hidden="true">' +
          '<span class="rec"><i></i><span id="tc">00:00:00:00</span></span>' +
          '<span id="loc">PER --:-- / HKG --:--</span>' +
        '</div>' +
        '<nav class="nav-links mono" aria-label="Primary">' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a>' +
          '<a href="' + W.url('#contact') + '">Contact</a>' +
        '</nav>' +
        '<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="sheet">' +
          '<i></i><i></i><i></i></button>' +
      '</div></header>' +
      '<div class="sheet" id="sheet">' +
        '<nav aria-label="Mobile">' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a>' +
          '<a href="' + W.url('#contact') + '">Contact</a></nav>' +
        '<div class="sheet-foot mono muted"><span data-mail></span><span data-locations></span></div>' +
      '</div>';

    var foot = W.$('#shell-foot');
    if (foot) foot.innerHTML =
      '<footer><div class="wrap"><div class="foot-grid">' +
        '<div class="foot-col"><h4>Studio</h4><p data-full></p><p data-locations></p></div>' +
        '<div class="foot-col"><h4>Index</h4>' +
          '<a href="' + W.url('work/') + '">Work</a>' +
          '<a href="' + W.url('#capabilities') + '">Capabilities</a>' +
          '<a href="' + W.url('#studio') + '">Studio</a>' +
          '<a href="' + W.url('#contact') + '">Contact</a></div>' +
        '<div class="foot-col" data-social><h4>Elsewhere</h4></div>' +
        '<div class="foot-col"><h4>Colophon</h4><p>Archivo / IBM Plex Mono</p><p>Instrument Serif</p>' +
          '<p>Hand-built. No framework.</p></div>' +
      '</div><div class="foot-bot mono muted">' +
        '<span>&copy; <span data-year></span> WNH</span><span id="f-tc">00:00:00:00</span>' +
      '</div></div></footer>';
  };

  /* any static link written as data-href="work/" is resolved against the base */
  W.links = function () {
    W.$$('[data-href]').forEach(function (a) { a.href = W.url(a.dataset.href); });
  };

  W.boot = function (render) {
    W.shell();
    W.links();
    W.menu();
    W.load().then(function (d) {
      W.chrome(d);
      if (render) render(d);
      W.reveal();
      W.meters();
      W.facades();
      document.body.classList.add('loaded');
    }).catch(function (err) {
      console.error('WNH: could not load content.json', err);
      document.body.classList.add('loaded');
      var e = W.$('[data-error]');
      if (e) e.hidden = false;
    });
  };

  global.WNH = W;
})(window);
