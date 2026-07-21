import { Emitter } from '../emitter/Emitter.js';
import { ParticlePool } from '../particle/ParticlePool.js';
import { ParticleSurface } from '../render/ParticleSurface.js';

export class EffectInstance {
  /**
   * @param {string} id
   * @param {Object} template
   * @param {number} x
   * @param {number} y
   * @param {Object} [options]
   */
  constructor(id, template, x, y, options = {}) {
    this.id = id;
    this.templateData = template;
    this.x = x;
    this.y = y;
    this.rotation = options.rotation ?? 0;
    this.scale = options.scale ?? 1;
    this.age = 0;
    this.lifetime = options.lifetime ?? template.duration;
    this.blendMode = options.blendMode ?? template.surface.blendMode;
    this.surface = new ParticleSurface(template.surface, options.surfaceFactory);
    this.tintCanvasFactory = options.tintCanvasFactory ?? createTintCanvas;
    this.tintCanvas = null;
    this.tintContext = null;
    this.random = options.random ?? Math.random;
    this.assetManager = options.assetManager ?? null;
    this.particlePool = options.particlePool ?? new ParticlePool();
    this.emitters = template.emitters.map(
      (emitterData) => new Emitter(emitterData, { random: this.random }),
    );
    this.particles = [];
    this.spawnBuffer = [];
    this.lastDrawCount = 0;
  }

  /**
   * @param {number} deltaTime
   */
  update(deltaTime) {
    const previousAge = this.age;
    this.age += deltaTime;

    for (const emitter of this.emitters) {
      this.spawnBuffer.length = 0;
      const particleDescriptors = emitter.emit(deltaTime, previousAge, this.age, this.spawnBuffer);

      for (const descriptor of particleDescriptors) {
        this.particles.push(this.particlePool.acquire(descriptor, this.random));
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.update(deltaTime);

      if (!particle.isAlive()) {
        this.particlePool.release(particle);
        this.particles.splice(index, 1);
      }
    }
  }

  /**
   * @returns {boolean}
   */
  isAlive() {
    return this.age < this.lifetime;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @returns {number}
   */
  render(context) {
    const particleDrawCount = this.renderToSurface();

    if (particleDrawCount === 0) {
      this.lastDrawCount = 0;
      return this.lastDrawCount;
    }

    this.drawSurface(context);
    this.lastDrawCount = particleDrawCount + 1;
    return this.lastDrawCount;
  }

  /**
   * @returns {number}
   */
  renderToSurface() {
    const surfaceContext = this.surface.context;
    const { width, height } = this.surface;
    const progress = Math.min(this.age / this.lifetime, 1);
    const alpha = 1 - progress;
    let drawCount = 0;

    this.surface.clear();

    if (this.particles.length === 0 || alpha <= 0) {
      return drawCount;
    }

    surfaceContext.save();
    surfaceContext.translate(width / 2, height / 2);

    for (const particle of this.particles) {
      drawCount += this.renderParticle(surfaceContext, particle, alpha);
    }

    surfaceContext.restore();

    return drawCount;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Object} particle
   * @param {number} surfaceAlpha
   * @returns {number}
   */
  renderParticle(context, particle, surfaceAlpha = 1) {
    const image = particle.spriteId ? this.assetManager?.get(particle.spriteId) : null;
    const size = particle.size * particle.scale;
    const alpha = Math.max(surfaceAlpha * particle.alpha, 0);

    if (alpha <= 0 || size <= 0) {
      return 0;
    }

    context.save();
    context.globalAlpha = alpha;
    context.globalCompositeOperation = particle.blendMode ?? 'source-over';
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);

    if (image) {
      this.drawTintedImage(context, image, particle.color, size);
      context.restore();
      return 1;
    }

    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.fill();
    context.restore();

    return 1;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {CanvasImageSource} image
   * @param {string} color
   * @param {number} size
   */
  drawTintedImage(context, image, color, size) {
    const pixelSize = Math.max(Math.ceil(size), 1);
    const tintContext = this.getTintContext(pixelSize);

    tintContext.save();
    tintContext.globalAlpha = 1;
    tintContext.globalCompositeOperation = 'source-over';
    tintContext.clearRect(0, 0, pixelSize, pixelSize);
    tintContext.drawImage(image, 0, 0, pixelSize, pixelSize);
    tintContext.globalCompositeOperation = 'source-in';
    tintContext.fillStyle = color;
    tintContext.fillRect(0, 0, pixelSize, pixelSize);
    tintContext.restore();

    context.drawImage(this.tintCanvas, -size / 2, -size / 2, size, size);
  }

  /**
   * @param {number} size
   * @returns {CanvasRenderingContext2D}
   */
  getTintContext(size) {
    if (!this.tintCanvas) {
      this.tintCanvas = this.tintCanvasFactory(size, size);
      this.tintContext = this.tintCanvas.getContext('2d');
    }

    if (this.tintCanvas.width !== size || this.tintCanvas.height !== size) {
      this.tintCanvas.width = size;
      this.tintCanvas.height = size;
    }

    return this.tintContext;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   */
  drawSurface(context) {
    const previousBlendMode = context.globalCompositeOperation;

    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.rotation);
    context.scale(this.scale, this.scale);
    context.globalCompositeOperation = this.blendMode;
    context.drawImage(this.surface.canvas, -this.surface.width / 2, -this.surface.height / 2);
    context.globalCompositeOperation = previousBlendMode;
    context.restore();
  }

  destroy() {
    for (const particle of this.particles) {
      this.particlePool.release(particle);
    }

    this.particles = [];
    this.spawnBuffer.length = 0;
    this.lastDrawCount = 0;
    this.tintCanvas = null;
    this.tintContext = null;
    this.surface.destroy();
  }
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement|OffscreenCanvas}
 */
function createTintCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  throw new Error('Tinted sprite rendering requires OffscreenCanvas or document.createElement("canvas").');
}