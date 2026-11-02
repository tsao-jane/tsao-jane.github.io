/* Jane Tsao portfolio — motion layer.
   Rules: every hidden/offset state is set here by JS, never by CSS, so the page stays fully
   visible if this file does not run. Everything respects prefers-reduced-motion. */
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.remove('no-js');
  html.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- 0. Scroll position: restore it ourselves, after ScrollTrigger has measured ---------- */
  var restoreKey = 'scroll:' + location.pathname;
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('pagehide', function () { try { sessionStorage.setItem(restoreKey, String(window.scrollY)); } catch (e) {} });
  } catch (e) {}
  var savedY = 0;
  try { savedY = parseInt(sessionStorage.getItem(restoreKey) || '0', 10) || 0; sessionStorage.removeItem(restoreKey); } catch (e) {}
  var navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type;
  var shouldRestore = savedY > 0 && !location.hash && (navType === 'reload' || navType === 'back_forward');

  // Smooth in-page anchor scrolling (CSS scroll-behavior is off while JS runs)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute('href');
    var target = id.length > 1 ? document.getElementById(id.slice(1)) : document.body;
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    if (history.pushState) history.pushState(null, '', id);
  });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Page transition (colour wipe) ---------- */
  var wipe = document.createElement('div');
  wipe.className = 'wipe';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<i class="w1"></i><i class="w2"></i><i class="w3"></i>';
  document.body.appendChild(wipe);
  var panels = $$('i', wipe);

  function wipeOut() { // reveal the page (panels slide up and away)
    if (!hasGsap || reduce) { panels.forEach(function (p) { p.style.transform = 'translateY(101%)'; }); return; }
    gsap.set(panels, { y: '0%' });
    gsap.to(panels, { y: '-101%', duration: .7, ease: 'power3.inOut', stagger: .08 });
  }
  function wipeIn(done) { // cover the page before leaving
    if (!hasGsap || reduce) { done(); return; }
    gsap.set(panels, { y: '101%' });
    gsap.to(panels, { y: '0%', duration: .55, ease: 'power3.inOut', stagger: .07, onComplete: done });
  }
  var entering = true;
  var cameFromWipe = false;
  try { cameFromWipe = sessionStorage.getItem('wipe') === '1'; sessionStorage.removeItem('wipe'); } catch (e) {}
  if (cameFromWipe) wipeOut(); else if (hasGsap) gsap.set(panels, { y: '101%' });

  function isInternal(a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (/^https?:\/\//i.test(href)) return false; // external
    return true;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isInternal(a)) return;
    e.preventDefault();
    var url = a.href;
    try { sessionStorage.setItem('wipe', '1'); } catch (err) {}
    var went = false;
    var go = function () { if (went) return; went = true; window.location.href = url; };
    wipeIn(go);
    setTimeout(go, 1200); // safety: navigate even if the tween never completes
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && hasGsap) gsap.set(panels, { y: '101%' }); // back/forward cache
  });

  /* ---------- 2. Hero intro: the big name assembles ---------- */
  var name = $('.name');
  if (name && !name.dataset.split) {
    var text = name.textContent.trim();
    name.setAttribute('aria-label', text);
    name.setAttribute('role', 'img');
    name.textContent = '';
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      if (ch === ' ') { s.className = 'sp'; s.innerHTML = '&nbsp;'; } else s.textContent = ch;
      s.setAttribute('aria-hidden', 'true');
      name.appendChild(s);
    });
    name.dataset.split = '1';
  }
  var introTl = null;
  if (name && hasGsap && !reduce) {
    var letters = $$('span:not(.sp)', name);
    introTl = gsap.timeline({ delay: cameFromWipe ? .35 : .1 });
    introTl.from(letters, {
      y: function () { return gsap.utils.random(-160, 160); },
      x: function () { return gsap.utils.random(-80, 80); },
      rotation: function () { return gsap.utils.random(-40, 40); },
      scale: .2, opacity: 0, duration: .9, ease: 'back.out(1.6)', stagger: { each: .05, from: 'random' }
    });
    var heroBits = $$('.under > div > *, .avail, .hero-mascot, .hero .bar > *');
    introTl.from(heroBits, { y: 30, opacity: 0, duration: .6, ease: 'power3.out', stagger: .07 }, '-=.45');
    introTl.from($$('.hero .sticker, .hero .spark'), { scale: 0, rotation: -40, opacity: 0, duration: .6, ease: 'back.out(2)', stagger: .08 }, '-=.5');
    // Safety: the parallax tween can overwrite-kill a staggered sticker before its opacity lands; force the end state.
    introTl.set($$('.hero .sticker, .hero .spark'), { opacity: 1, scale: 1 }, '+=.05');
    // the .avail card keeps its CSS rotate; GSAP's `from` only tweens y/opacity so the rotate stays.
  }

  /* ---------- 3. Scroll reveals ---------- */
  if (hasST && !reduce) {
    var reveals = $$('[data-reveal]');
    reveals.forEach(function (el) {
      var kind = el.dataset.reveal || 'up';
      var from = { opacity: 0, y: 44 };
      if (kind === 'tilt') from = { opacity: 0, y: 50, rotation: -5, scale: .94, transformOrigin: '50% 100%' };
      if (kind === 'pop') from = { opacity: 0, scale: .6, rotation: -12 };
      if (kind === 'left') from = { opacity: 0, x: -60 };
      if (kind === 'right') from = { opacity: 0, x: 60 };
      gsap.set(el, from);
      el.dataset.revealFrom = JSON.stringify(from);
    });
    ScrollTrigger.batch(reveals, {
      start: 'top 90%',
      once: true,
      onEnter: function (els) {
        els.forEach(function (el, i) {
          var kind = el.dataset.reveal || 'up';
          gsap.to(el, {
            opacity: 1, y: 0, x: 0, scale: 1,
            rotation: el.dataset.rot ? parseFloat(el.dataset.rot) : 0,
            duration: kind === 'pop' ? .7 : .85,
            ease: kind === 'pop' ? 'back.out(2)' : 'power3.out',
            delay: i * .08, overwrite: 'auto',
            onComplete: function () { el.style.willChange = ''; }
          });
        });
      }
    });
    // Safety net: anything in view that is still invisible after a while gets shown.
    var watchlist = reveals.concat($$('.hero .sticker, .hero .spark'));
    setInterval(function () {
      watchlist.forEach(function (el) {
        if (parseFloat(getComputedStyle(el).opacity) < .05) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) gsap.to(el, { opacity: 1, y: 0, x: 0, scale: 1, rotation: el.dataset.rot ? parseFloat(el.dataset.rot) : 0, duration: .6 });
        }
      });
    }, 2500);
  }

  /* ---------- 4. Parallax stickers + sparkles ---------- */
  if (hasST && !reduce) {
    $$('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.dataset.parallax) || .2;
      var section = el.closest('section, footer, header, .band') || el.parentElement;
      gsap.to(el, {
        y: function () { return -speed * 320; }, ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: .6 }
      });
    });
  }

  /* ---------- 5. Step cards fan out (pinned on desktop) ---------- */
  var steps = $('.steps');
  if (steps && hasST && !reduce) {
    var cards = $$('li', steps);
    var wide = window.innerWidth > 860;
    if (wide) {
      var rect = steps.getBoundingClientRect();
      var centerX = rect.width / 2;
      var tl = gsap.timeline({
        scrollTrigger: { trigger: $('.how'), start: 'top top', end: '+=110%', scrub: .5, pin: true, anticipatePin: 1 }
      });
      cards.forEach(function (c, i) {
        var cr = c.getBoundingClientRect();
        var dx = centerX - (cr.left - rect.left + cr.width / 2);
        var rot = parseFloat(c.dataset.rot) || 0, dy = parseFloat(c.dataset.dy) || 0;
        gsap.set(c, { x: dx, y: 120, rotation: (i - 1.5) * 4, scale: .9, zIndex: 10 - i });
        tl.to(c, { x: 0, y: dy, rotation: rot, scale: 1, ease: 'power2.out', duration: 1 }, i * .12);
      });
      tl.from($('.note'), { opacity: 0, y: 30, duration: .6 }, .5);
    } else {
      cards.forEach(function (c, i) {
        var rot = parseFloat(c.dataset.rot) || 0;
        gsap.set(c, { rotation: rot });
        gsap.from(c, { opacity: 0, y: 60, rotation: rot - 8, duration: .8, ease: 'back.out(1.4)',
          scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
      });
    }
  }

  /* ---------- 6. Marquee that reacts to scroll ---------- */
  $$('.tick .track').forEach(function (track) {
    if (!hasGsap || reduce) { track.style.animation = ''; return; }
    var pos = 0, dir = 1, vel = 0, base = 60; // px per second
    var half = function () { return track.scrollWidth / 2; };
    if (hasST) ScrollTrigger.create({ onUpdate: function (self) { dir = self.direction || dir; vel = Math.abs(self.getVelocity()); } });
    gsap.ticker.add(function (t, dt) {
      var speed = base + Math.min(vel, 3000) * .25;
      vel *= .92;
      pos -= speed * (dt / 1000) * dir;
      var h = half();
      if (h > 0) { if (pos <= -h) pos += h; if (pos > 0) pos -= h; }
      track.style.transform = 'translateX(' + pos + 'px)';
    });
  });

  /* ---------- 7. Count-up numbers ---------- */
  function fmt(v, dec, comma) {
    var s = v.toFixed(dec);
    if (comma) { var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = p.join('.'); }
    return s;
  }
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', comma = el.dataset.comma !== undefined;
    var finalText = pre + fmt(target, dec, comma) + suf;
    if (!hasST || reduce) { el.textContent = finalText; return; }
    el.textContent = pre + fmt(0, dec, comma) + suf;
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () {
        gsap.to(obj, { v: target, duration: 1.8, ease: 'power3.out',
          onUpdate: function () { el.textContent = pre + fmt(obj.v, dec, comma) + suf; },
          onComplete: function () { el.textContent = finalText; } });
      }
    });
    setTimeout(function () { if (el.textContent !== finalText && obj.v === 0) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.textContent = finalText; } }, 5000);
  });

  /* ---------- 8. Mascot eyes follow the cursor (plus blink + idle glances) ---------- */
  var mascots = $$('.mascot, .logo-eyes');
  if (mascots.length && hasGsap) {
    var pointer = null, lastMove = 0;
    var look = function (px, py) {
      mascots.forEach(function (m) {
        $$('.eye', m).forEach(function (eye) {
          var r = eye.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy) || 1;
          var max = r.width * .22, k = Math.min(dist, 400) / 400 * max;
          gsap.to($('.pupil', eye), { x: dx / dist * k, y: dy / dist * k, duration: .35, ease: 'power2.out', overwrite: 'auto' });
        });
      });
    };
    if (finePointer && !reduce) {
      window.addEventListener('pointermove', function (e) { pointer = [e.clientX, e.clientY]; lastMove = Date.now(); look(e.clientX, e.clientY); }, { passive: true });
    }
    if (!reduce) {
      // idle glances when the pointer is quiet (also what touch users see)
      setInterval(function () {
        if (Date.now() - lastMove < 2500) return;
        var m = mascots[0].getBoundingClientRect();
        look(m.left + m.width / 2 + gsap.utils.random(-500, 500), m.top + m.height / 2 + gsap.utils.random(-300, 300));
      }, 2200);
      // blink
      var blink = function () {
        mascots.forEach(function (m) {
          gsap.to($$('.eye', m), { scaleY: .08, duration: .08, yoyo: true, repeat: 1, transformOrigin: '50% 50%' });
        });
        gsap.delayedCall(gsap.utils.random(2.5, 5.5), blink);
      };
      gsap.delayedCall(2, blink);
    }
  }

  /* ---------- 9. Pill nav: section highlight + magnetic hover ---------- */
  var pill = $('.pill');
  if (pill) {
    var links = $$('a', pill);
    var hashLinks = links.filter(function (a) { return a.getAttribute('href').charAt(0) === '#' && $(a.getAttribute('href')); });
    if (hashLinks.length) {
      var ticking = false;
      var highlight = function () {
        ticking = false;
        var mid = window.innerHeight * .5, current = hashLinks[0];
        hashLinks.forEach(function (a) {
          var sec = $(a.getAttribute('href'));
          var wrap = sec.closest('.pin-spacer') || sec; // pinned sections live inside a spacer
          if (wrap.getBoundingClientRect().top <= mid) current = a;
        });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = hashLinks[hashLinks.length - 1];
        links.forEach(function (l) { l.classList.toggle('on', l === current); });
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(highlight); } }, { passive: true });
      window.addEventListener('load', highlight);
      highlight();
    }
    if (finePointer && hasGsap && !reduce) {
      links.forEach(function (a) {
        a.addEventListener('pointermove', function (e) {
          var r = a.getBoundingClientRect();
          gsap.to(a, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .3 });
        });
        a.addEventListener('pointerleave', function () { gsap.to(a, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,.5)' }); });
      });
    }
  }

  /* ---------- 10. Cursor companion (fine pointers only) ---------- */
  if (finePointer && hasGsap && !reduce) {
    var cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    var cx = -100, cy = -100, tx = cx, ty = cy, shown = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cur.classList.add('on'); cx = tx; cy = ty; }
      var hot = e.target.closest && e.target.closest('a, button, .card, .shotcard, .tools li, .sticker.hoverable');
      cur.classList.toggle('big', !!hot);
    }, { passive: true });
    window.addEventListener('pointerdown', function () { cur.classList.add('press'); });
    window.addEventListener('pointerup', function () { cur.classList.remove('press'); });
    document.addEventListener('mouseleave', function () { cur.classList.remove('on'); shown = false; });
    gsap.ticker.add(function () {
      cx += (tx - cx) * .22; cy += (ty - cy) * .22;
      cur.style.transform = 'translate(' + (cx - 0) + 'px,' + (cy - 0) + 'px) translate(-50%,-50%)';
    });
  }

  /* ---------- 11. Card tilt on hover ---------- */
  if (finePointer && hasGsap && !reduce) {
    $$('.card, .num, .panel').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - .5) * -6, ry = ((e.clientX - r.left) / r.width - .5) * 6;
        gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 900, duration: .35, ease: 'power2.out' });
      });
      card.addEventListener('pointerleave', function () { gsap.to(card, { rotateX: 0, rotateY: 0, duration: .6, ease: 'elastic.out(1,.6)' }); });
    });
  }

  /* ---------- 12. Sticker wobble on press (touch-friendly) ---------- */
  $$('.sticker.hoverable').forEach(function (s) {
    s.addEventListener('pointerdown', function () {
      if (!hasGsap || reduce) return;
      gsap.fromTo(s, { rotation: -10, scale: .9 }, { rotation: 0, scale: 1, duration: .8, ease: 'elastic.out(1,.35)' });
    });
  });

  /* ---------- refresh triggers once fonts and images are ready ---------- */
  var restored = false;
  function restoreScroll() {
    if (restored) return; restored = true;
    if (shouldRestore) { window.scrollTo(0, savedY); if (hasST) ScrollTrigger.refresh(); }
    else if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 16); }
  }
  if (hasST) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); restoreScroll(); setTimeout(function () { ScrollTrigger.refresh(); }, 600); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  } else {
    window.addEventListener('load', restoreScroll);
  }
})();
