(() => {
    if (customElements.get('day-night-toggle')) return;

    const assets = new URL('./assets/', document.currentScript.src);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const fullTurn = Math.PI * 2;
    const transitionDuration = 1450;
    const random = (min, max) => min + (max - min) * Math.random();

    function loadPhoto(name) {
      const image = new Image();
      image.src = new URL(name, assets);
      return image;
    }

    const lakePhoto = loadPhoto('alpine-lake.webp');
    const sunPhoto = loadPhoto('sun-sdo.webp');
    const moonPhoto = loadPhoto('moon-nasa.webp');
    const photosReady = Promise.allSettled([lakePhoto, sunPhoto, moonPhoto].map(image => image.decode()));

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: var(--day-night-toggle-width, 24rem);
          max-width: 100%;
          vertical-align: middle;
        }

        :host([hidden]) { display: none; }

        button {
          display: block;
          position: relative;
          box-sizing: border-box;
          width: 100%;
          aspect-ratio: 2.5;
          padding: 0;
          border: 1px solid #abb9ff8a;
          border-radius: 9999px;
          overflow: hidden;
          background: #293657;
          box-shadow: 0 18px 35px #0008, 0 0 0 6px #14182862, 0 0 0 7px #c8d0ff23;
          cursor: pointer;
          touch-action: manipulation;
          transition: box-shadow .25s ease, transform .2s ease, border-color 1s ease;
          -webkit-tap-highlight-color: transparent;
        }

        canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          clip-path: inset(0 round 9999px);
          pointer-events: none;
        }

        button::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          box-shadow: inset 0 2px 3px #fff5, inset 0 -9px 15px #04091875;
        }

        button:not(:disabled):hover {
          box-shadow: 0 19px 38px #0008, 0 0 0 6px #14182862, 0 0 0 7px #d5dcff62;
        }

        button:not(:disabled):active { transform: scale(.975); }
        button:disabled { cursor: default; opacity: .7; }
        :host([day]) button { border-color: #ffe6adbc; }

        button:focus-visible {
          outline: 2px solid var(--day-night-toggle-focus, #fff4d4);
          outline-offset: 7px;
        }

        @media (prefers-reduced-motion: reduce) {
          button { transition: none; }
          button:not(:disabled):active { transform: none; }
        }
      </style>
      <button type="button" part="button" aria-pressed="false">
        <canvas aria-hidden="true"></canvas>
      </button>
    `;

    function makeStars() {
      const now = performance.now();
      return Array.from({ length: 53 }, () => ({
        x: random(12, 348),
        y: random(4, 101),
        radius: random(.32, .88),
        baseline: random(.16, .46),
        peak: random(.7, 1),
        start: now + random(0, 4200),
        duration: random(480, 1250)
      }));
    }

    function drawStars(ctx, stars, time, opacity) {
      ctx.fillStyle = '#ebf3ff';
      for (const star of stars) {
        if (time >= star.start + star.duration) {
          star.start = time + random(500, 6200);
          star.duration = random(480, 1550);
          star.peak = random(.65, 1);
        }

        const progress = (time - star.start) / star.duration;
        const pulse = progress > 0 ? Math.sin(Math.PI * progress) ** 2 : 0;
        ctx.globalAlpha = opacity * (star.baseline + (star.peak - star.baseline) * pulse);
        circle(ctx, star.x, star.y, star.radius * (1 + pulse * .55));
        ctx.fill();
      }
    }

    function glow(ctx, x, y, radius, color, opacity) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(' + color + ',' + opacity + ')');
      gradient.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    function circle(ctx, x, y, radius) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, fullTurn);
    }

    // The occlusion path follows the skyline of alpine-lake.webp.
    const skyline = new Path2D();
    skyline.moveTo(0, 0);
    skyline.lineTo(360, 0);
    for (const [x, y] of [
      [360, 98], [350, 100], [339, 99], [330, 100], [320, 101.5], [310, 100.1],
      [300, 96.5], [295, 94.3], [285, 93.6], [280, 92.4], [270, 92.2], [265, 93.1],
      [255, 91.4], [245, 92.9], [235, 94.3], [225, 94.8], [220, 95.8], [210, 98.2],
      [205, 98.2], [195, 97], [190, 96.5], [185, 97], [180, 97.7], [175, 99.4],
      [170, 101.5], [165, 103], [155, 102], [145, 103.2], [140, 103.9], [125, 102.7],
      [115, 103.2], [105, 104.6], [90, 101.5], [75, 102.5], [62, 103], [47, 105],
      [36, 105], [26, 94], [17, 86], [13, 96], [9, 85], [5, 97], [0, 99]
    ]) skyline.lineTo(x, y);
    skyline.closePath();

    function drawSky(canvas, ctx, stars, time, daylight) {
      ctx.setTransform(canvas.width / 360, 0, 0, canvas.height / 144, 0, 0);
      ctx.clearRect(0, 0, 360, 144);
      if (lakePhoto.naturalWidth) ctx.drawImage(lakePhoto, 0, 0, 360, 144);

      const tint = ctx.createLinearGradient(0, 0, 0, 144);
      tint.addColorStop(0, '#1e376c');
      tint.addColorStop(.65, '#355781');
      tint.addColorStop(1, '#6b7fa2');
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 1 - daylight;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, 360, 144);
      ctx.restore();

      ctx.save();
      ctx.clip(skyline);

      if (daylight < 1) drawStars(ctx, stars, time, (1 - daylight) ** 1.7);

      ctx.globalCompositeOperation = 'screen';

      const sunX = 105 + 46 * daylight;
      const sunY = 47 + 82 * (1 - daylight) ** 1.45;
      const sunlight = Math.min(1, daylight * 2.1);
      ctx.globalAlpha = sunlight;
      glow(ctx, sunX, sunY, 61, [255, 182, 102], .45);
      if (sunPhoto.naturalWidth) {
        ctx.save();
        circle(ctx, sunX, sunY, 18.7);
        ctx.clip();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = sunlight * .85;
        ctx.drawImage(sunPhoto, sunX - 19, sunY - 19, 38, 38);
        ctx.globalAlpha = sunlight * .22;
        ctx.fillStyle = '#fffbdc';
        ctx.fillRect(sunX - 19, sunY - 19, 38, 38);
        ctx.restore();
      }

      const moonX = 230 + 40 * daylight;
      const moonY = 44 + 86 * daylight;
      ctx.globalAlpha = Math.min(1, (1 - daylight) * 1.85);
      glow(ctx, moonX, moonY, 41, [132, 167, 255], .18);
      if (moonPhoto.naturalWidth) ctx.drawImage(moonPhoto, moonX - 18, moonY - 18, 36, 36);

      ctx.restore();
    }

    class DayNightToggle extends HTMLElement {
      static observedAttributes = ['day', 'disabled', 'label'];

      #button;
      #canvas;
      #context;
      #stars = makeStars();
      #resizeObserver;
      #hasSize = false;
      #frame = 0;
      #light = 0;
      #from = 0;
      #target = 0;
      #transitionStart = 0;

      constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
        shadow.append(template.content.cloneNode(true));
        this.#button = shadow.querySelector('button');
        this.#canvas = shadow.querySelector('canvas');
        this.#context = this.#canvas.getContext('2d');

        this.#button.addEventListener('click', () => {
          this.day = !this.day;
          this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { day: this.day }
          }));
        });

        this.#resizeObserver = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          this.#hasSize = width > 0 && height > 0;
          if (!this.#hasSize) return;

          const scale = Math.min(window.devicePixelRatio || 1, 2);
          this.#canvas.width = Math.max(1, Math.round(width * scale));
          this.#canvas.height = Math.max(1, Math.round(height * scale));
          this.#requestDraw();
        });
      }

      get day() { return this.hasAttribute('day'); }
      set day(value) { this.toggleAttribute('day', Boolean(value)); }

      get disabled() { return this.hasAttribute('disabled'); }
      set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }

      click() { this.#button.click(); }

      connectedCallback() {
        // Preserve properties assigned before the component registered.
        for (const key of ['day', 'disabled']) {
          if (!Object.hasOwn(this, key)) continue;
          const value = this[key];
          delete this[key];
          this[key] = value;
        }

        this.#button.setAttribute('aria-label', this.getAttribute('label') || 'Day mode');
        this.#button.setAttribute('aria-pressed', String(this.day));
        this.#button.disabled = this.disabled;
        this.#light = this.#from = this.#target = Number(this.day);
        this.#resizeObserver.observe(this.#canvas);
        motion.addEventListener('change', this.#requestDraw);
        photosReady.then(this.#requestDraw);
        this.#requestDraw();
      }

      disconnectedCallback() {
        this.#resizeObserver.disconnect();
        motion.removeEventListener('change', this.#requestDraw);
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
        this.#hasSize = false;
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        if (name === 'label') {
          this.#button.setAttribute('aria-label', newValue || 'Day mode');
        } else if (name === 'disabled') {
          this.#button.disabled = this.disabled;
        } else {
          this.#button.setAttribute('aria-pressed', String(this.day));
          this.#from = this.#light;
          this.#target = Number(this.day);
          this.#transitionStart = performance.now();
          this.#requestDraw();
        }
      }

      #requestDraw = () => {
        if (!this.#frame && this.isConnected && this.#hasSize && this.#context) {
          this.#frame = requestAnimationFrame(this.#drawFrame);
        }
      };

      #drawFrame = (time) => {
        this.#frame = 0;
        if (!this.#hasSize) return;

        const elapsed = Math.max(0, time - this.#transitionStart);
        const progress = motion.matches || this.#from === this.#target
          ? 1
          : Math.min(elapsed / transitionDuration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        this.#light = progress === 1 ? this.#target : this.#from + (this.#target - this.#from) * eased;

        drawSky(this.#canvas, this.#context, this.#stars, motion.matches ? 0 : time, this.#light);
        if (!motion.matches && (progress < 1 || this.#light < 1)) this.#requestDraw();
      };
    }

    customElements.define('day-night-toggle', DayNightToggle);
})();
