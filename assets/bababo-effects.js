(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var depthItems = [];
  var frameRequested = false;

  var depthMap = [
    { selector: '.bababo-hero-media', travel: 34, rotate: 3.2 },
    { selector: '.bababo-promo-banner', travel: 26, rotate: -2.2 },
    { selector: '.bababo-story-grid', travel: 22, rotate: 2 },
    { selector: '.bababo-offer-card', travel: 14, rotate: 1.4 },
    { selector: '.bababo-category-card', travel: 10, rotate: -1 },
    { selector: '.bababo-product-card', travel: 12, rotate: 1.2 },
    { selector: '.bababo-proof-item', travel: 8, rotate: -.8 }
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function registerDepthItems(root) {
    root = root || document;

    depthMap.forEach(function (config) {
      root.querySelectorAll(config.selector).forEach(function (element) {
        if (element.dataset.bababoMotionReady === 'true') return;
        element.dataset.bababoMotionReady = 'true';
        element.classList.add('bababo-depth-item');
        depthItems.push({
          element: element,
          travel: config.travel,
          rotate: config.rotate
        });
      });
    });

    if (finePointer.matches && !reduceMotion.matches) {
      root.querySelectorAll('.bababo-category-card, .bababo-offer-card, .bababo-product-card, .bababo-proof-item').forEach(registerTilt);
    }

    requestMotionFrame();
  }

  function registerTilt(element) {
    if (element.dataset.bababoTiltReady === 'true') return;
    element.dataset.bababoTiltReady = 'true';
    element.classList.add('bababo-tilt-item');

    element.addEventListener('pointermove', function (event) {
      var rect = element.getBoundingClientRect();
      var x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      var y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      element.style.setProperty('--bababo-pointer-x', ((x - .5) * 7).toFixed(2) + 'deg');
      element.style.setProperty('--bababo-pointer-y', ((.5 - y) * 7).toFixed(2) + 'deg');
      element.style.setProperty('--bababo-shine-x', (x * 100).toFixed(1) + '%');
      element.style.setProperty('--bababo-shine-y', (y * 100).toFixed(1) + '%');
    }, { passive: true });

    element.addEventListener('pointerleave', function () {
      element.style.setProperty('--bababo-pointer-x', '0deg');
      element.style.setProperty('--bababo-pointer-y', '0deg');
      element.style.setProperty('--bababo-shine-x', '50%');
      element.style.setProperty('--bababo-shine-y', '50%');
    }, { passive: true });
  }

  function updateMotion() {
    frameRequested = false;

    if (reduceMotion.matches) {
      depthItems.forEach(function (item) {
        item.element.style.removeProperty('--bababo-scroll-y');
        item.element.style.removeProperty('--bababo-scroll-rotate');
      });
      return;
    }

    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    depthItems = depthItems.filter(function (item) { return item.element.isConnected; });

    depthItems.forEach(function (item) {
      var rect = item.element.getBoundingClientRect();
      if (rect.bottom < -160 || rect.top > viewportHeight + 160) return;

      var elementCenter = rect.top + rect.height / 2;
      var progress = clamp((viewportHeight / 2 - elementCenter) / (viewportHeight * .72), -1, 1);
      item.element.style.setProperty('--bababo-scroll-y', (progress * item.travel).toFixed(2) + 'px');
      item.element.style.setProperty('--bababo-scroll-rotate', (progress * item.rotate).toFixed(2) + 'deg');
    });
  }

  function requestMotionFrame() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateMotion);
  }

  function init() {
    registerDepthItems(document);
    window.addEventListener('scroll', requestMotionFrame, { passive: true });
    window.addEventListener('resize', requestMotionFrame, { passive: true });
    reduceMotion.addEventListener('change', requestMotionFrame);

    document.addEventListener('shopify:section:load', function (event) {
      registerDepthItems(event.target);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
