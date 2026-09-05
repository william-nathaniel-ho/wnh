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

  /* The rule that fades an image in is gated on this class: if the script
     never runs, images simply show, rather than staying invisible forever. */
  document.documentElement.className += ' js';

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
             /* f_auto alone hands Safari a still JPEG for an animated GIF — it
                picks the best format without regard for the frames. f_auto:animated
                keeps the choice inside formats that can actually animate, which is
                the difference between motion work playing on an iPhone and not. */
             '/image/upload/f_auto:animated,q_auto,c_limit,w_' + (w || 1440) + '/' + id;
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

    var posterUrl = conf.poster
      ? (W.cld.ok(conf.poster) ? W.cld.img(conf.poster, 720) : W.url(conf.poster))
      : (src.poster || '');

    var still = document.createElement('div');
    still.className = 'loop-still';
    if (posterUrl) {
      var pi = document.createElement('img');
      pi.alt = '';
      /* a poster that will not load must not leave a broken-image glyph */
      pi.addEventListener('error', function () { still.innerHTML = W.MARK; }, { once: true });
      pi.src = posterUrl;
      still.appendChild(pi);
    } else {
      still.innerHTML = W.MARK;
    }
    box.appendChild(still);

    var ready = function () { box.classList.add('is-ready'); };

    if (src.kind === 'file') {
      var v = document.createElement('video');
      v.className = 'loop-media';
      /* the poster goes on the video itself as well as behind it: if a phone
         refuses to autoplay, the element still shows the film's first frame
         rather than a black rectangle */
      if (posterUrl) v.poster = posterUrl;
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.preload = W.reduce ? 'metadata' : 'auto';
      v.src = src.url;

      if (W.reduce) {
        /* nothing autoplays under reduced motion: hand over the real controls,
           and drop the still so it cannot sit on top of them */
        v.controls = true;
        v.removeAttribute('aria-hidden');
        still.remove();
        ready();
      } else {
        v.autoplay = true;
        /* iOS fires these inconsistently, and can refuse autoplay outright
           (Low Power Mode, data saver). Reveal on whichever arrives first, and
           reveal anyway once the first frame exists — a paused first frame is
           a better result than a holding mark that never leaves. */
        ['playing', 'loadeddata', 'canplay'].forEach(function (ev) {
          v.addEventListener(ev, ready, { once: true });
        });
        box.appendChild(v);
        var kick = v.play();
        if (kick && kick.catch) {
          kick.catch(function () {
            /* autoplay refused — show it as a still and let a tap start it */
            ready();
            v.controls = true;
            v.removeAttribute('aria-hidden');
            box.classList.add('is-paused');
          });
        }
        v.addEventListener('error', function () {
          box.classList.remove('is-ready');
          if (v.parentNode) v.parentNode.removeChild(v);
        });
        return true;
      }
      v.addEventListener('error', function () {
        box.classList.remove('is-ready');
        if (v.parentNode) v.parentNode.removeChild(v);
      });
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

  /* Hold each image box with the quiet mark until its picture has decoded,
     then fade the picture in. Runs over whatever is on the page now and can be
     called again after a re-render. */
  W.imgloads = function (root) {
    W.$$('.media, .card-media', root).forEach(function (box) {
      if (box.dataset.plWatched) return;
      var img = box.querySelector('img');
      if (!img) { box.classList.add('is-loaded'); return; }
      box.dataset.plWatched = '1';
      var done = function () { box.classList.add('is-loaded'); };
      if (img.complete && img.naturalWidth) return done();
      img.addEventListener('load', done, { once: true });
      /* a broken or blocked image must not leave the box stuck loading */
      img.addEventListener('error', done, { once: true });
    });
  };

  /* the page overlay comes down once the content is on screen */
  W.unveil = function () {
    var el = W.$('#preload');
    if (!el) return;
    el.classList.add('done');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  };

  /* ---------------------------------------------------------- the player

     One skin, three engines: a file gets a real <video>; Vimeo and YouTube
     get their iframes driven over postMessage, so there is no SDK to download
     and the controls are ours in every case.

     It behaves the way a portfolio should — the film starts, muted, when it
     scrolls into view and stops when it leaves; sound is one tap away and
     stays on for the rest of the visit once asked for; nothing autoplays
     under reduced motion. */

  var soundOn = false;          /* remembered across every player on the page */

  var ICON = {
    play:  '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M8 5.5h3v13H8zM13 5.5h3v13h-3z" fill="currentColor"/></svg>',
    on:    '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    off:   '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  W.youtubeId = function (url) {
    var m = String(url || '').match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : null;
  };
  /* what kind of link is this? */
  W.videoKind = function (url) {
    if (W.youtubeId(url)) return 'youtube';
    if (W.vimeoId(url)) return 'vimeo';
    return null;
  };

  function clock(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  /* The shared skin. `engine` supplies play/pause/seek/volume; the skin never
     knows or cares which of the three it is talking to. */
  function skin(box, engine) {
    box.classList.add('vp');
    var ui = document.createElement('div');
    ui.className = 'vp-ui';
    ui.innerHTML =
      '<button class="vp-big" type="button" aria-label="Play">' + ICON.play + '</button>' +
      '<div class="vp-bottom">' +
        '<button class="vp-toggle" type="button" aria-label="Play">' + ICON.play + '</button>' +
        '<div class="vp-track" role="slider" tabindex="0" aria-label="Seek"' +
          ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="vp-seek"></div><div class="vp-fill"></div><div class="vp-knob"></div></div>' +
        '<span class="vp-time">0:00</span>' +
        '<button class="vp-sound" type="button" aria-label="Turn sound on">' + ICON.off + '</button>' +
      '</div>';
    box.appendChild(ui);

    var big = ui.querySelector('.vp-big'),
        tog = ui.querySelector('.vp-toggle'),
        track = ui.querySelector('.vp-track'),
        fill = ui.querySelector('.vp-fill'),
        knob = ui.querySelector('.vp-knob'),
        time = ui.querySelector('.vp-time'),
        snd = ui.querySelector('.vp-sound');

    var duration = 0, scrubbing = false;

    function setPlaying(on) {
      box.classList.toggle('is-playing', !!on);
      big.setAttribute('aria-label', on ? 'Pause' : 'Play');
      tog.innerHTML = on ? ICON.pause : ICON.play;
      tog.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }
    function setSound(on) {
      box.classList.toggle('is-loud', !!on);
      snd.innerHTML = on ? ICON.on : ICON.off;
      snd.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    }
    function paint(at, of) {
      if (of) duration = of;
      if (scrubbing) return;              /* the thumb belongs to the finger */
      var pct = duration ? Math.min(100, Math.max(0, at / duration * 100)) : 0;
      fill.style.width = pct + '%';
      knob.style.left = pct + '%';
      track.setAttribute('aria-valuenow', Math.round(pct));
      time.textContent = clock(at) + (duration ? ' / ' + clock(duration) : '');
    }

    /* ---- scrubbing: pointer events, so mouse touch and pen are one path ---- */
    function ratioAt(clientX) {
      var r = track.getBoundingClientRect();
      return r.width ? Math.max(0, Math.min(1, (clientX - r.left) / r.width)) : 0;
    }
    function preview(ratio) {
      var pct = ratio * 100;
      fill.style.width = pct + '%';
      knob.style.left = pct + '%';
      time.textContent = clock(ratio * duration) + (duration ? ' / ' + clock(duration) : '');
    }
    track.addEventListener('pointerdown', function (e) {
      if (!duration) return;
      scrubbing = true;
      box.classList.add('is-scrubbing');
      track.setPointerCapture(e.pointerId);
      preview(ratioAt(e.clientX));
      e.preventDefault();
    });
    track.addEventListener('pointermove', function (e) {
      if (scrubbing) preview(ratioAt(e.clientX));
    });
    function drop(e) {
      if (!scrubbing) return;
      scrubbing = false;
      box.classList.remove('is-scrubbing');
      var r = ratioAt(e.clientX);
      engine.seek(r * duration);
      preview(r);
    }
    track.addEventListener('pointerup', drop);
    track.addEventListener('pointercancel', function () {
      scrubbing = false; box.classList.remove('is-scrubbing');
    });
    /* a plain click still works, including for anything without pointer events */
    track.addEventListener('click', function (e) {
      if (!duration) return;
      var r = ratioAt(e.clientX);
      engine.seek(r * duration);
      preview(r);
    });
    track.addEventListener('keydown', function (e) {
      if (!duration) return;
      var step = e.shiftKey ? 10 : 5, now = engine.at();
      if (e.key === 'ArrowRight') { engine.seek(Math.min(duration, now + step)); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { engine.seek(Math.max(0, now - step)); e.preventDefault(); }
    });

    /* ---- the buttons ---- */
    function hit() {
      /* Hide the big button on the click itself rather than waiting for the
         engine to confirm — a remote player can take a moment to answer, and
         a button that lingers reads as a click that did not register. */
      if (!box.classList.contains('is-playing')) box.classList.add('is-playing');
      engine.toggle();
    }
    big.addEventListener('click', hit);
    tog.addEventListener('click', hit);
    snd.addEventListener('click', function () {
      soundOn = !soundOn;
      engine.volume(soundOn);
      setSound(soundOn);
      if (soundOn) engine.play();
    });

    setSound(false);
    setPlaying(false);
    return { setPlaying: setPlaying, setSound: setSound, paint: paint,
             get scrubbing() { return scrubbing; } };
  }

  /* start and stop as the player passes through the viewport */
  function watch(box, onIn, onOut) {
    if (W.reduce || !('IntersectionObserver' in global)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? onIn() : onOut(); });
    }, { threshold: 0.55 }).observe(box);
  }

  /* ---- a Cloudinary / local file ---- */
  function filePlayer(box) {
    var v = document.createElement('video');
    v.className = 'vp-media';
    if (box.dataset.poster) v.poster = box.dataset.poster;
    v.playsInline = true; v.muted = !soundOn; v.preload = 'metadata';
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.src = box.dataset.src;
    box.insertBefore(v, box.firstChild);

    var ui = skin(box, {
      toggle: function () { v.paused ? go() : v.pause(); },
      play: function () { if (v.paused) go(); },
      seek: function (t) { try { v.currentTime = t; } catch (e) { /* not seekable yet */ } },
      at: function () { return v.currentTime || 0; },
      volume: function (on) { v.muted = !on; }
    });

    function go() { var p = v.play(); if (p && p.catch) p.catch(function () { ui.setPlaying(false); }); }

    /* timeupdate only fires about four times a second, which reads as a bar
       that jumps rather than moves. Paint from a frame loop instead. */
    var raf = null;
    function tick() {
      if (v.paused || v.ended) { raf = null; return; }
      ui.paint(v.currentTime, v.duration);
      raf = requestAnimationFrame(tick);
    }
    v.addEventListener('play', function () {
      ui.setPlaying(true);
      if (!raf) raf = requestAnimationFrame(tick);
    });
    v.addEventListener('pause', function () { ui.setPlaying(false); });
    v.addEventListener('ended', function () { ui.setPlaying(false); ui.paint(v.duration, v.duration); });
    v.addEventListener('timeupdate', function () { ui.paint(v.currentTime, v.duration); });
    v.addEventListener('loadedmetadata', function () { ui.paint(0, v.duration); });
    v.addEventListener('durationchange', function () { ui.paint(v.currentTime, v.duration); });
    ui.setSound(soundOn);

    watch(box, function () { if (v.paused) go(); }, function () { if (!v.paused) v.pause(); });
  }

  /* ---- Vimeo and YouTube, over postMessage: no SDK, our own controls ---- */
  function embedPlayer(box) {
    var url = box.dataset.url, kind = W.videoKind(url);
    if (!kind) return;

    var f = document.createElement('iframe');
    f.className = 'vp-media';
    f.title = box.dataset.title || 'Film';
    f.setAttribute('frameborder', '0');
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.setAttribute('allowfullscreen', '');

    var origin, dur = 0, at = 0, playing = false, live = false, ui;

    if (kind === 'vimeo') {
      var vi = W.vimeoId(url);
      origin = 'https://player.vimeo.com';
      f.src = origin + '/video/' + vi.id + (vi.hash ? '?h=' + vi.hash + '&' : '?') +
        'controls=0&title=0&byline=0&portrait=0&dnt=1&autopause=0&muted=1&playsinline=1';
    } else {
      origin = 'https://www.youtube.com';
      f.src = origin + '/embed/' + W.youtubeId(url) +
        '?enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&mute=1&fs=0&iv_load_policy=3';
    }
    box.insertBefore(f, box.firstChild);

    function post(payload) {
      if (!f.contentWindow) return;
      try { f.contentWindow.postMessage(JSON.stringify(payload), origin); } catch (e) { /* not ready */ }
    }
    /* the two services speak different dialects of the same idea */
    var cmd = kind === 'vimeo'
      ? {
          play:   function () { post({ method: 'play' }); },
          pause:  function () { post({ method: 'pause' }); },
          /* the modern player uses setCurrentTime; older embeds used seekTo.
             Sending both is harmless — the one it does not know is ignored. */
          seek:   function (t) { post({ method: 'setCurrentTime', value: t });
                                 post({ method: 'seekTo', value: t }); },
          volume: function (on) { post({ method: 'setVolume', value: on ? 1 : 0 }); },
          ask:    function () { post({ method: 'getDuration' }); }
        }
      : {
          play:   function () { post({ event: 'command', func: 'playVideo', args: [] }); },
          pause:  function () { post({ event: 'command', func: 'pauseVideo', args: [] }); },
          seek:   function (t) { post({ event: 'command', func: 'seekTo', args: [t, true] }); },
          volume: function (on) {
            post({ event: 'command', func: on ? 'unMute' : 'mute', args: [] });
            post({ event: 'command', func: 'setVolume', args: [on ? 100 : 0] });
          },
          ask:    function () { post({ event: 'listening', id: 1, channel: 'widget' }); }
        };

    ui = skin(box, {
      toggle: function () { playing ? want(false) : want(true); },
      play: function () { if (!playing) want(true); },
      seek: function (t) { at = t; cmd.seek(t); },
      at: function () { return at; },
      volume: function (on) { cmd.volume(on); }
    });

    /* Between progress messages the bar would sit still, so it is advanced
       locally frame by frame from the last reported position and snapped back
       whenever the service reports where it really is. */
    var raf = null, markAt = 0, markT = 0;
    function mark(sec) { markAt = sec; markT = (global.performance || Date).now(); }
    function tick() {
      if (!playing) { raf = null; return; }
      var t = markAt + ((global.performance || Date).now() - markT) / 1000;
      at = dur ? Math.min(t, dur) : t;
      ui.paint(at, dur);
      raf = requestAnimationFrame(tick);
    }
    function started() {
      playing = true; ui.setPlaying(true); mark(at);
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function stopped() { playing = false; ui.setPlaying(false); }

    /* A player that is already on screen gets its play command before the
       iframe is listening, and the message is simply lost. Remember the
       intent and issue it the moment the player says it is ready. */
    var wanted = false;
    function want(on) {
      wanted = on;
      if (!live) return;
      on ? cmd.play() : cmd.pause();
    }
    function flush() { if (wanted) cmd.play(); }

    global.addEventListener('message', function (e) {
      if (e.source !== f.contentWindow) return;
      var d = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
      if (!d) return;

      if (kind === 'vimeo') {
        /* Vimeo has shipped two names for the same thing over the years —
           playProgress on the classic player, timeupdate on the current one.
           Ask for both and answer to both. */
        if (d.event === 'ready' || d.method === 'ready') {
          live = true;
          ['play', 'pause', 'ended', 'finish', 'timeupdate', 'playProgress', 'seeked', 'loaded']
            .forEach(function (ev) { post({ method: 'addEventListener', value: ev }); });
          cmd.volume(soundOn); ui.setSound(soundOn); cmd.ask(); flush();
        }
        /* every Vimeo event carries the position and length in its data */
        if (d.data && typeof d.data === 'object') {
          if (typeof d.data.duration === 'number' && d.data.duration) dur = d.data.duration;
          if (typeof d.data.seconds === 'number') { at = d.data.seconds; mark(at); ui.paint(at, dur); }
        }
        if (d.event === 'play') started();
        else if (d.event === 'pause') stopped();
        else if (d.event === 'finish' || d.event === 'ended') { stopped(); ui.paint(dur, dur); }
        else if (d.method === 'getDuration') { dur = d.value || dur; ui.paint(at, dur); }
      } else {
        /* YouTube answers the listening handshake, then streams infoDelivery */
        if (d.event === 'onReady' || d.event === 'initialDelivery') {
          live = true; cmd.volume(soundOn); ui.setSound(soundOn); flush();
        }
        var info = d.info;
        if (info && typeof info === 'object') {
          if (typeof info.duration === 'number' && info.duration) dur = info.duration;
          if (typeof info.currentTime === 'number') { at = info.currentTime; mark(at); }
          ui.paint(at, dur);
          if (typeof info.playerState === 'number') {
            info.playerState === 1 ? started() : stopped();
          }
        }
        if (d.event === 'onStateChange') { d.info === 1 ? started() : stopped(); }
      }
    });

    /* YouTube needs the handshake repeated until the frame is listening */
    if (kind === 'youtube') {
      var tries = 0;
      var ping = setInterval(function () {
        if (live || ++tries > 40) return clearInterval(ping);
        cmd.ask();
      }, 250);
      f.addEventListener('load', function () { cmd.ask(); });
    }

    watch(box, function () { want(true); }, function () { want(false); });
  }

  W.players = function (root) {
    W.$$('[data-player]', root).forEach(function (box) {
      if (box.dataset.vpDone) return;
      box.dataset.vpDone = '1';
      if (box.dataset.player === 'file') filePlayer(box); else embedPlayer(box);
    });
  };

  /* kept so older markup still works */
  W.facades = function () { W.players(); };

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
      W.imgloads();
      document.body.classList.add('loaded');
      W.unveil();
    }).catch(function (err) {
      /* this catch covers the whole render, not just the fetch — say which */
      console.error('WNH: ' + (W.data ? 'failed while building the page' :
                    'could not load content.json'), err);
      document.body.classList.add('loaded');
      W.unveil();
    });
  };

  global.WNH = W;
})(window);
