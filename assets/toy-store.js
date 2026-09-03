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
      if (!hero) return;

      let pointerX = 0, pointerY = 0, ticking = false;
      const scrubVideo = section.hasAttribute('data-toy-video-scrub') ? section.querySelector('.toy-hero__video') : null;
      const scrubSeconds = Math.max(.5, Number(section.dataset.toyScrubSeconds || 5));
      let targetVideoTime = 0;
      let videoFrame = 0;
      let videoSeekQueued = false;
      let videoPrimed = false;
      let scrollIdleTimer = 0;
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const scrub = () => {
        videoFrame = 0;
        if (!scrubVideo || scrubVideo.readyState < 2 || !Number.isFinite(scrubVideo.duration) || scrubVideo.duration <= 0) return;
        if (scrubVideo.seeking) {
          if (!videoSeekQueued) {
            videoSeekQueued = true;
            scrubVideo.addEventListener('seeked', () => {
              videoSeekQueued = false;
              if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
            }, { once: true });
          }
          return;
        }
        const current = Number.isFinite(scrubVideo.currentTime) ? scrubVideo.currentTime : 0;
        const distance = targetVideoTime - current;
        if (Math.abs(distance) <= .025) {
          scrubVideo.currentTime = targetVideoTime;
          return;
        }
        const step = Math.sign(distance) * Math.min(Math.abs(distance), .16);
        scrubVideo.currentTime = clamp(current + step, 0, Math.max(0, scrubVideo.duration - .04));
        videoSeekQueued = true;
        scrubVideo.addEventListener('seeked', () => {
          videoSeekQueued = false;
          if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
        }, { once: true });
      };
      const primeVideo = () => {
        if (!scrubVideo || videoPrimed) return;
        videoPrimed = true;
        const rememberedTime = Number.isFinite(scrubVideo.currentTime) ? scrubVideo.currentTime : 0;
        const playback = scrubVideo.play();
        if (!playback) return;
        playback.then(() => {
          scrubVideo.pause();
          scrubVideo.currentTime = rememberedTime;
          if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
        }).catch(() => {
          videoPrimed = false;
          if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
        });
      };
      const setVideoProgress = (progress) => {
        if (!scrubVideo || !Number.isFinite(scrubVideo.duration) || scrubVideo.duration <= 0) return;
        const maxVideoTime = Math.min(Math.max(0, scrubVideo.duration - .08), scrubSeconds);
        targetVideoTime = clamp(progress * maxVideoTime, 0, maxVideoTime);
        if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
      };
      const render = () => {
        const rect = section.getBoundingClientRect();
        const stickyTop = window.innerWidth <= 760 ? 8 : 18;
        const travel = Math.max(section.offsetHeight - hero.offsetHeight - stickyTop, 1);
        const progress = clamp((stickyTop - rect.top) / travel, 0, 1);
        const centered = progress * 2 - 1;
        section.style.setProperty('--toy-scroll-progress', progress.toFixed(4));
        section.style.setProperty('--toy-scroll-center', centered.toFixed(4));
        section.style.setProperty('--toy-pointer-x', pointerX.toFixed(4));
        section.style.setProperty('--toy-pointer-y', pointerY.toFixed(4));
        setVideoProgress(progress);
        ticking = false;
      };
      const requestRender = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
      const handleScroll = () => {
        if (scrubVideo) {
          primeVideo();
          section.classList.add('is-video-scrubbing');
          window.clearTimeout(scrollIdleTimer);
          scrollIdleTimer = window.setTimeout(() => section.classList.remove('is-video-scrubbing'), 180);
        }
        requestRender();
      };
      scrubVideo?.addEventListener('loadedmetadata', requestRender, { once: true });
      scrubVideo?.addEventListener('loadeddata', () => {
        if (!videoFrame) videoFrame = requestAnimationFrame(scrub);
      }, { once: true });
      if (reduceMotion.matches && !scrubVideo) {
        section.style.setProperty('--toy-scroll-progress', '0');
        section.style.setProperty('--toy-scroll-center', '0');
        return;
      }
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', requestRender, { passive: true });
      if (!reduceMotion.matches) {
        hero.addEventListener('pointermove', (event) => {
          const rect = hero.getBoundingClientRect();
          pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
          pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
          requestRender();
        });
        hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; requestRender(); });
      }
      requestRender();
    });
  }

  function initHeroVideo(root = document) {
    root.querySelectorAll('[data-toy-parallax-section]').forEach((section) => {
      const video = section.querySelector('.toy-hero__video');
      const control = section.querySelector('[data-toy-video-control]');
      if (!video || video.dataset.toyVideoReady) return;
      video.dataset.toyVideoReady = 'true';
      if (section.hasAttribute('data-toy-video-scrub')) {
        video.pause();
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        if (video.readyState === 0) video.load();
        if (control) control.hidden = true;
        return;
      }
      const icon = control?.querySelector('span');
      const syncControl = () => {
        if (!control) return;
        const paused = video.paused;
        control.setAttribute('aria-label', paused ? 'Reproduzir vídeo' : 'Pausar vídeo');
        if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
      };
      if (reduceMotion.matches) {
        video.pause();
        video.dataset.userPaused = 'true';
      } else {
        video.play().catch(syncControl);
      }
      control?.addEventListener('click', () => {
        if (video.paused) {
          video.dataset.userPaused = 'false';
          video.play().catch(syncControl);
        } else {
          video.dataset.userPaused = 'true';
          video.pause();
        }
        syncControl();
      });
      video.addEventListener('play', syncControl);
      video.addEventListener('pause', syncControl);
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) video.pause();
            else if (video.dataset.userPaused !== 'true' && !reduceMotion.matches) video.play().catch(syncControl);
          });
        }, { threshold: .12 });
        observer.observe(section);
      }
      syncControl();
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

  const init = (root = document) => { initDrawer(root); initHeroVideo(root); initParallax(root); initFooterParallax(root); initReveal(root); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => init()) : init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
