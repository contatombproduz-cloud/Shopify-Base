(() => {
  const SELECTOR = '[data-toy-parallax-section]';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initDrawer(root = document) {
    root.querySelectorAll('[data-toy-header]').forEach((header) => {
      if (header.dataset.toyReady) return;
      header.dataset.toyReady = 'true';
      const openButton = header.querySelector('[data-toy-menu-open]');
      const layer = header.nextElementSibling;
      if (!openButton || !layer?.matches('[data-toy-drawer-layer]')) return;
      const drawer = layer.querySelector('[data-toy-drawer]');
      const closeButtons = layer.querySelectorAll('[data-toy-menu-close]');

      const close = () => {
        layer.classList.remove('is-open');
        openButton.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('toy-menu-open');
        window.setTimeout(() => { layer.hidden = true; openButton.focus(); }, 320);
      };
      const open = () => {
        layer.hidden = false;
        requestAnimationFrame(() => layer.classList.add('is-open'));
        openButton.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('toy-menu-open');
        window.setTimeout(() => drawer.focus(), 80);
      };
      openButton.addEventListener('click', open);
      closeButtons.forEach((button) => button.addEventListener('click', close));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !layer.hidden) close();
      });
    });
  }

  function initParallax(root = document) {
    root.querySelectorAll(SELECTOR).forEach((section) => {
      if (section.dataset.toyReady) return;
      section.dataset.toyReady = 'true';
      const hero = section.querySelector('[data-toy-tilt]');
      const layers = [...section.querySelectorAll('[data-toy-parallax]')];
      if (!hero || !layers.length || reduceMotion.matches) return;

      let pointerX = 0, pointerY = 0, ticking = false;
      const render = () => {
        const rect = section.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const scrollProgress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - center) / window.innerHeight));
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.toyParallax || 0);
          const travel = scrollProgress * 210;
          layer.style.transform = `translate3d(${pointerX * depth * 34}px, ${(travel + pointerY * 28) * depth}px, ${Math.abs(depth) * 90}px) scale(${1 + Math.abs(depth) * .035})`;
        });
        hero.style.transform = `rotateX(${pointerY * -2.1 + scrollProgress * .8}deg) rotateY(${pointerX * 3.1}deg) translateY(${scrollProgress * -5}px)`;
        ticking = false;
      };
      const requestRender = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
      window.addEventListener('scroll', requestRender, { passive: true });
      hero.addEventListener('pointermove', (event) => {
        const rect = hero.getBoundingClientRect();
        pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
        pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
        requestRender();
      });
      hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; requestRender(); });
      requestRender();
    });
  }

  function initFooterParallax(root = document) {
    root.querySelectorAll('[data-toy-footer]').forEach((footer) => {
      if (footer.dataset.toyMotionReady) return;
      footer.dataset.toyMotionReady = 'true';
      const layers = [...footer.querySelectorAll('[data-toy-footer-parallax]')];
      if (!layers.length || reduceMotion.matches) return;
      let ticking = false;
      const render = () => {
        const rect = footer.getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height) * 2 - .5));
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.toyFooterParallax || 0);
          layer.style.transform = `translate3d(0, ${progress * depth * -170}px, ${Math.abs(depth) * 40}px) scale(${1 + Math.abs(depth) * .04})`;
        });
        ticking = false;
      };
      const requestRender = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
      window.addEventListener('scroll', requestRender, { passive: true });
      requestRender();
    });
  }

  function initReveal(root = document) {
    const autoTargets = root.querySelectorAll(
      '.section-main-product .product > *, .section-main-collection .collection > *, .section-main-cart .cart > *, .section-main-search .search > *, .section-main-page .main-page > *, .section-contact-form .contact > *, .section-main-blog .blog-card, .section-main-article .article > *, .section-main-list-collections .list-collections__item, .section-related-products .card-product'
    );
    autoTargets.forEach((element) => element.classList.add('toy-auto-reveal'));
    const targets = root.querySelectorAll('[data-toy-reveal]:not([data-toy-observed]), .toy-auto-reveal:not([data-toy-observed])');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -45px' });
    targets.forEach((element, index) => {
      element.dataset.toyObserved = 'true';
      element.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
      observer.observe(element);
    });
  }

  const init = (root = document) => { initDrawer(root); initParallax(root); initFooterParallax(root); initReveal(root); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => init()) : init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
