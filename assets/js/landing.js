/* ==========================================================================
   STUDIO · Landing Page — Motion System
   Restrained by design: parallax 2–8px, hover 150–200ms, image 300–450ms.
   No loops, no auto-carousel, no glow.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header scroll state ---------- */
  var head = document.getElementById('siteHead');
  function onHeadScroll() {
    if (head) head.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  /* ---------- Reveal on enter ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Hero gallery: mouse parallax (max ~8px) + slow scroll drift ---------- */
  var gallery = document.getElementById('gallery');
  var band = document.getElementById('galleryBand');
  if (gallery && !reduced && finePointer) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    var tick = function () {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      gallery.style.setProperty('--mx', cx.toFixed(2) + 'px');
      gallery.style.setProperty('--my', cy.toFixed(2) + 'px');
      if (Math.abs(tx - cx) > 0.04 || Math.abs(ty - cy) > 0.04) {
        raf = requestAnimationFrame(tick);
      } else { raf = null; }
    };
    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 16;   /* ±8px */
      ty = (e.clientY / window.innerHeight - 0.5) * 12;  /* ±6px */
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }
  if (band && !reduced) {
    var onBandScroll = function () {
      var r = band.getBoundingClientRect();
      var p = clamp(1 - (r.bottom / (window.innerHeight + r.height)), 0, 1);
      band.style.setProperty('--sy', (-14 * p).toFixed(2) + 'px');
    };
    window.addEventListener('scroll', onBandScroll, { passive: true });
    onBandScroll();
  }

  /* ---------- Scroll-driven sections ---------- */
  var flowTrack = document.getElementById('flowTrack');
  var flowSteps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var flowStages = Array.prototype.slice.call(document.querySelectorAll('.stage'));
  var growthTrack = document.getElementById('growthTrack');
  var growthNum = document.getElementById('growthNum');
  var growthTiles = Array.prototype.slice.call(document.querySelectorAll('.gtile-g'));
  var growthTicks = Array.prototype.slice.call(document.querySelectorAll('.gtick'));
  var MS = [12, 86, 286, 728];
  var flowCur = -1;

  function setFlowStage(i) {
    if (i === flowCur) return;
    flowCur = i;
    flowStages.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    flowSteps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
  }

  function updGrowth(p) {
    var t = p * 3;
    var i = Math.min(2, Math.floor(t));
    var f = t - i;
    var e = f * f * (3 - 2 * f); /* smoothstep — slow, natural */
    var val = MS[i] + (MS[i + 1] - MS[i]) * e;
    if (growthNum) growthNum.textContent = String(Math.round(val));
    growthTiles.forEach(function (el, k) {
      el.style.setProperty('--on', clamp(p * 12 - k, 0, 1).toFixed(3));
    });
    growthTicks.forEach(function (el, k) {
      el.classList.toggle('is-active', p >= k / 3 - 0.001);
    });
  }

  var scrollRaf = false;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(function () {
      scrollRaf = false;
      onHeadScroll();

      var vh = window.innerHeight;

      if (flowTrack) {
        var total = flowTrack.offsetHeight - vh;
        var p = total > 0 ? clamp(-flowTrack.getBoundingClientRect().top / total, 0, 1) : 0;
        setFlowStage(Math.min(4, Math.floor(p * 5 + 0.001)));
      }

      if (growthTrack) {
        var gTotal = growthTrack.offsetHeight - vh;
        var gp = gTotal > 0 ? clamp(-growthTrack.getBoundingClientRect().top / gTotal, 0, 1) : 0;
        if (!reduced) updGrowth(gp);
        else {
          if (growthNum) growthNum.textContent = '728';
          growthTiles.forEach(function (el) { el.style.setProperty('--on', 1); });
          growthTicks.forEach(function (el) { el.classList.add('is-active'); });
        }
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
