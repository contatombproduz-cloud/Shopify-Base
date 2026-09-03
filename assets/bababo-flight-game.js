(() => {
  if (customElements.get('bababo-flight-game')) return;

  class BababoFlightGame extends HTMLElement {
    connectedCallback() {
      if (this.ready) return;
      this.ready = true;
      this.goal = Number(this.dataset.goal || 7);
      this.code = this.dataset.code || 'ASAS10';
      this.score = 0;
      this.best = 0;
      this.active = false;
      this.obstacles = [];

      this.panel = this.querySelector('[data-game-panel]');
      this.stage = this.querySelector('[data-game-stage]');
      this.bird = this.querySelector('[data-game-bird]');
      this.obstacleLayer = this.querySelector('[data-game-obstacles]');
      this.scoreNode = this.querySelector('[data-game-score]');
      this.bestNode = this.querySelector('[data-game-best]');
      this.startScreen = this.querySelector('[data-game-start-screen]');
      this.result = this.querySelector('[data-game-result]');
      this.hint = this.querySelector('[data-game-hint]');
      this.live = this.querySelector('[data-game-live]');
      this.couponWrap = this.querySelector('[data-game-coupon-wrap]');
      this.birdFrames = Array.from(this.querySelectorAll('.bababo-game__bird-frame'));
      this.wingSequence = [0, 1, 2, 1];
      this.wingFrame = 0;
      this.wingFrameInterval = 90;
      this.bird.classList.add('is-frame-ready');
      this.showWingFrame(1);

      this.querySelector('[data-game-open]')?.addEventListener('click', () => this.open());
      this.querySelector('[data-game-start]')?.addEventListener('click', () => this.start());
      this.querySelector('[data-game-retry]')?.addEventListener('click', () => this.start());
      this.querySelector('[data-game-close]')?.addEventListener('click', () => this.close());
      this.stagePressEvent = window.PointerEvent ? 'pointerdown' : 'touchstart';
      this.onStagePress = (event) => {
        if (!this.active || event.target.closest('button, a')) return;
        event.preventDefault();
        this.flap();
      };
      this.stage?.addEventListener(this.stagePressEvent, this.onStagePress, { passive: false });
      this.stage?.addEventListener('keydown', (event) => {
        if (!['Space', 'ArrowUp'].includes(event.code)) return;
        event.preventDefault();
        if (this.active) this.flap();
        else if (!this.panel.hidden && !this.startScreen.hidden) this.start();
      });
      this.onResize = () => {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
          if (!this.active) return;
          const currentWidth = this.stage.getBoundingClientRect().width;
          if (Math.abs(currentWidth - this.stageWidth) > 32) this.finish(false);
        }, 180);
      };
      window.addEventListener('resize', this.onResize, { passive: true });
    }

    disconnectedCallback() {
      this.stopLoop();
      window.removeEventListener('resize', this.onResize);
      this.stage?.removeEventListener(this.stagePressEvent, this.onStagePress);
    }

    open() {
      this.stopLoop();
      this.active = false;
      this.panel.hidden = false;
      this.startScreen.hidden = false;
      this.result.hidden = true;
      this.bird.hidden = true;
      this.hint.hidden = true;
      this.stage.classList.remove('is-playing', 'is-crashed');
      this.clearObstacles();
      this.scoreNode.textContent = '0';
      this.bestNode.textContent = String(this.best);
      this.panel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      this.querySelector('[data-game-start]')?.focus();
    }

    close() {
      this.stopLoop();
      this.active = false;
      this.panel.hidden = true;
      this.stage.classList.remove('is-playing', 'is-crashed');
      this.querySelector('[data-game-open]')?.focus();
    }

    start() {
      this.stopLoop();
      this.clearObstacles();
      this.measure();
      this.score = 0;
      this.active = true;
      this.velocity = 0;
      this.birdX = this.stageWidth * 0.23;
      this.birdY = this.stageHeight * 0.46;
      this.scoreNode.textContent = '0';
      this.bestNode.textContent = String(this.best);
      this.startScreen.hidden = true;
      this.result.hidden = true;
      this.couponWrap.hidden = true;
      this.bird.hidden = false;
      this.hint.hidden = false;
      this.stage.classList.remove('is-crashed');
      this.stage.classList.add('is-playing');
      this.wingFrame = 0;
      this.lastWingFrame = performance.now();
      this.showWingFrame(this.wingSequence[this.wingFrame]);
      this.renderBird();
      this.spawnObstacle(this.stageWidth + 90);
      this.nextSpawnAt = performance.now() + this.spawnInterval;
      this.lastFrame = performance.now();
      this.accumulator = 0;
      this.live.textContent = `O voo começou. Atravesse ${this.goal} portais de nuvens.`;
      try {
        this.stage.focus({ preventScroll: true });
      } catch (error) {
        this.stage.focus();
      }
      this.flap();
      this.hintTimer = window.setTimeout(() => { this.hint.hidden = true; }, 1800);
      this.frame = requestAnimationFrame((time) => this.update(time));
    }

    measure() {
      const bounds = this.stage.getBoundingClientRect();
      this.stageWidth = bounds.width;
      this.stageHeight = bounds.height;
      this.birdSize = this.bird.getBoundingClientRect().width || Math.min(96, Math.max(70, this.stageWidth * 0.085));
      this.gravity = Math.max(820, this.stageHeight * 1.75);
      this.flapStrength = -Math.max(330, this.stageHeight * 0.68);
      this.obstacleSpeed = Math.max(155, this.stageWidth * 0.155);
      this.obstacleWidth = Math.min(112, Math.max(74, this.stageWidth * 0.085));
      this.gapSize = Math.min(215, Math.max(158, this.stageHeight * 0.34));
      this.spawnInterval = Math.max(1320, Math.min(1750, (this.stageWidth * 0.36 / this.obstacleSpeed) * 1000));
    }

    flap() {
      if (!this.active) return;
      this.velocity = this.flapStrength;
      this.hint.hidden = true;
      this.wingFrame = 0;
      this.lastWingFrame = performance.now();
      this.showWingFrame(this.wingSequence[this.wingFrame]);
      this.bird.classList.remove('is-flapping');
      requestAnimationFrame(() => this.bird.classList.add('is-flapping'));
    }

    update(time) {
      if (!this.active) return;
      const frameDelta = Math.min((time - this.lastFrame) / 1000, 0.05);
      this.lastFrame = time;
      this.accumulator += frameDelta;

      if (time >= this.nextSpawnAt) {
        this.spawnObstacle(this.stageWidth + this.obstacleWidth);
        this.nextSpawnAt = time + this.spawnInterval;
      }

      const fixedStep = 1 / 120;
      while (this.accumulator >= fixedStep) {
        this.velocity += this.gravity * fixedStep;
        this.birdY += this.velocity * fixedStep;
        this.obstacles.forEach((obstacle) => {
          obstacle.x -= this.obstacleSpeed * fixedStep;
          if (!obstacle.passed && obstacle.x + obstacle.width < this.birdX) {
            obstacle.passed = true;
            this.score += 1;
            this.best = Math.max(this.best, this.score);
            this.scoreNode.textContent = String(this.score);
            this.bestNode.textContent = String(this.best);
            this.live.textContent = `${this.score} de ${this.goal} portais atravessados.`;
            this.stage.classList.remove('has-scored');
            requestAnimationFrame(() => this.stage.classList.add('has-scored'));
            if (this.score >= this.goal) this.finish(true);
          }
        });
        if (!this.active) return;
        if (this.hasCollision()) {
          this.finish(false);
          return;
        }
        this.accumulator -= fixedStep;
      }

      this.obstacles.forEach((obstacle) => {
        obstacle.element.style.transform = `translate3d(${obstacle.x}px,0,0)`;
      });
      this.obstacles = this.obstacles.filter((obstacle) => {
        if (obstacle.x + obstacle.width >= -30) return true;
        obstacle.element.remove();
        return false;
      });

      this.renderBird();
      this.updateWingFrame(time);
      this.frame = requestAnimationFrame((nextTime) => this.update(nextTime));
    }

    updateWingFrame(time) {
      if (!this.birdFrames.length) return;
      const elapsed = time - this.lastWingFrame;
      if (elapsed < this.wingFrameInterval) return;
      const steps = Math.floor(elapsed / this.wingFrameInterval);
      this.wingFrame = (this.wingFrame + steps) % this.wingSequence.length;
      this.lastWingFrame += steps * this.wingFrameInterval;
      this.showWingFrame(this.wingSequence[this.wingFrame]);
    }

    showWingFrame(frameIndex) {
      this.birdFrames.forEach((frame, index) => {
        frame.classList.toggle('is-active', index === frameIndex);
      });
    }

    renderBird() {
      const tilt = Math.max(-24, Math.min(68, this.velocity * 0.085));
      const x = this.birdX - this.birdSize / 2;
      const y = this.birdY - this.birdSize / 2;
      this.bird.style.transform = `translate3d(${x}px,${y}px,0) rotate(${tilt}deg)`;
    }

    spawnObstacle(x) {
      const safeMargin = 62;
      const minCenter = safeMargin + this.gapSize / 2;
      const maxCenter = this.stageHeight - safeMargin - this.gapSize / 2;
      const center = minCenter + Math.random() * Math.max(1, maxCenter - minCenter);
      const topHeight = center - this.gapSize / 2;
      const bottomTop = center + this.gapSize / 2;
      const element = document.createElement('div');
      const top = document.createElement('span');
      const bottom = document.createElement('span');
      element.className = 'bababo-game__obstacle';
      top.className = 'bababo-game__cloud-wall bababo-game__cloud-wall--top';
      bottom.className = 'bababo-game__cloud-wall bababo-game__cloud-wall--bottom';
      top.style.height = `${topHeight}px`;
      bottom.style.height = `${this.stageHeight - bottomTop}px`;
      element.style.width = `${this.obstacleWidth}px`;
      element.style.transform = `translate3d(${x}px,0,0)`;
      element.append(top, bottom);
      this.obstacleLayer.appendChild(element);
      this.obstacles.push({ element, x, width: this.obstacleWidth, topHeight, bottomTop, passed: false });
    }

    hasCollision() {
      const halfX = this.birdSize * 0.28;
      const halfY = this.birdSize * 0.25;
      const birdLeft = this.birdX - halfX;
      const birdRight = this.birdX + halfX;
      const birdTop = this.birdY - halfY;
      const birdBottom = this.birdY + halfY;
      if (birdTop <= 0 || birdBottom >= this.stageHeight) return true;
      return this.obstacles.some((obstacle) => {
        const overlapsX = birdRight > obstacle.x + 8 && birdLeft < obstacle.x + obstacle.width - 8;
        const hitsWall = birdTop < obstacle.topHeight - 4 || birdBottom > obstacle.bottomTop + 4;
        return overlapsX && hitsWall;
      });
    }

    finish(won) {
      if (!this.active) return;
      this.active = false;
      this.stopLoop();
      this.stage.classList.remove('is-playing');
      this.stage.classList.toggle('is-crashed', !won);
      this.bird.hidden = true;
      this.hint.hidden = true;
      this.result.hidden = false;
      const title = this.querySelector('[data-game-result-title]');
      const text = this.querySelector('[data-game-result-text]');
      const icon = this.querySelector('[data-game-result-icon]');
      if (won) {
        title.textContent = 'Você ganhou!';
        text.textContent = `Você atravessou ${this.goal} portais e fez a imaginação criar asas.`;
        icon.textContent = '🎉';
        this.querySelector('[data-game-coupon]').textContent = this.code;
        this.couponWrap.hidden = false;
        this.live.textContent = `Parabéns! Seu cupom é ${this.code}.`;
      } else {
        title.textContent = 'A aventura continua!';
        text.textContent = `Você atravessou ${this.score} ${this.score === 1 ? 'portal' : 'portais'}. Toque para tentar um novo voo.`;
        icon.textContent = '☁️';
        this.couponWrap.hidden = true;
        this.live.textContent = `Fim do voo com ${this.score} ${this.score === 1 ? 'ponto' : 'pontos'}.`;
      }
      this.querySelector('[data-game-retry]')?.focus();
    }

    clearObstacles() {
      this.obstacles = [];
      this.obstacleLayer.textContent = '';
    }

    stopLoop() {
      cancelAnimationFrame(this.frame);
      window.clearTimeout(this.hintTimer);
      window.clearTimeout(this.resizeTimer);
    }
  }

  customElements.define('bababo-flight-game', BababoFlightGame);
})();
