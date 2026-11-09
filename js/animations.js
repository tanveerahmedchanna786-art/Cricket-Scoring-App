/**
 * animations.js - Offline Animation & Particle Celebration System
 * Provides:
 * 1. Lightweight Canvas Confetti Engine (zero external libraries, 100% offline).
 * 2. Big Celebration Banners (FOUR, SIX, WICKET).
 * 3. Screen shake effects.
 */

const AnimationManager = {
  canvas: null,
  ctx: null,
  particles: [],
  animating: false,

  init() {
    this.canvas = document.getElementById('confetti-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  },

  // Trigger celebration popup banner
  showCelebrationBanner(type, subtitle = '') {
    const banner = document.getElementById('celebration-banner');
    if (!banner) return;

    const titleEl = document.getElementById('banner-title');
    const subEl = document.getElementById('banner-sub');

    banner.className = 'celebration-banner-wrapper active ' + type;

    if (type === 'banner-four') {
      titleEl.textContent = '⚡ FOUR!';
      subEl.textContent = subtitle || 'Boundary hit with elegance!';
      this.burstConfetti(25, ['#2979ff', '#00e676', '#ffffff']);
    } else if (type === 'banner-six') {
      titleEl.textContent = '🚀 MAXIMUM 6!';
      subEl.textContent = subtitle || 'Massive hit sailing into the stands!';
      this.burstConfetti(50, ['#ffd700', '#00e676', '#ff9100', '#ffffff']);
    } else if (type === 'banner-wicket') {
      titleEl.textContent = '💥 WICKET OUT!';
      subEl.textContent = subtitle || 'Huge breakthrough for the bowling side!';
      this.triggerScreenShake();
    } else if (type === 'banner-win') {
      titleEl.textContent = '🏆 CHAMPIONS!';
      subEl.textContent = subtitle;
      this.burstConfetti(120, ['#ffd700', '#00e676', '#2979ff', '#ff3d00', '#ffffff']);
    }

    // Auto dismiss after 1.5s
    setTimeout(() => {
      banner.classList.remove('active');
    }, 1500);
  },

  // Subtle screen shake on wickets
  triggerScreenShake() {
    const phone = document.querySelector('.phone-wrapper');
    if (phone) {
      phone.classList.add('screen-shake');
      setTimeout(() => phone.classList.remove('screen-shake'), 450);
    }
  },

  // Canvas Confetti Explosion
  burstConfetti(count = 40, colors = ['#00e676', '#ffd700', '#ff3d00', '#2979ff', '#ffffff']) {
    if (!this.canvas || !this.ctx) return;
    this.resizeCanvas();

    const originX = this.canvas.width / 2;
    const originY = this.canvas.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
        life: 0.95 + Math.random() * 0.04
      });
    }

    if (!this.animating) {
      this.animating = true;
      requestAnimationFrame(() => this._updateParticles());
    }
  },

  _updateParticles() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.rotation += p.vRot;
      p.opacity *= p.life;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();

      if (p.opacity < 0.05 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this._updateParticles());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

if (typeof window !== 'undefined') {
  window.AnimationManager = AnimationManager;
}
