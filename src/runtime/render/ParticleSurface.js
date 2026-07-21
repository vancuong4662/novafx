export class ParticleSurface {
  /**
   * @param {Object} config
   * @param {number} config.width
   * @param {number} config.height
   * @param {Function} [surfaceFactory]
   */
  constructor(config, surfaceFactory = createDefaultSurfaceCanvas) {
    this.width = config.width;
    this.height = config.height;
    this.canvas = surfaceFactory(this.width, this.height);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');
    this.destroyed = false;
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.canvas.width = 0;
    this.canvas.height = 0;
    this.context = null;
    this.canvas = null;
    this.destroyed = true;
  }
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement|OffscreenCanvas}
 */
function createDefaultSurfaceCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }

  throw new Error('Particle surface requires OffscreenCanvas or document.createElement("canvas").');
}