import { EffectManager } from './EffectManager.js';

/**
 * @typedef {Object} NovaFXOptions
 * @property {string} [backgroundColor]
 * @property {boolean} [clearCanvas]
 * @property {boolean} [showIdleState]
 * @property {Object<string, string|Object>|Array<{id: string, src: string}>} [assets]
 */

export class NovaFX {
  /**
   * @param {HTMLCanvasElement|CanvasRenderingContext2D} target
   * @param {NovaFXOptions} [options]
   */
  constructor(target, options = {}) {
    const resolvedTarget = resolveCanvasTarget(target);

    this.canvas = resolvedTarget.canvas;
    this.context = resolvedTarget.context;
    this.options = {
      backgroundColor: '#070807',
      ...options,
    };
    this.effects = new EffectManager(this.context, this.options);
  }

  /**
   * @param {string|Object} effectSource
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  load(effectSource, options = {}) {
    return this.effects.load(effectSource, options);
  }

  /**
   * @param {string} id
   * @param {string|Object} asset
   */
  registerAsset(id, asset) {
    this.effects.registerAsset(id, asset);
  }

  /**
   * @param {string} effectId
   * @param {number} x
   * @param {number} y
   * @param {Object} [options]
   * @returns {string}
   */
  play(effectId, x, y, options = {}) {
    return this.effects.play(effectId, x, y, options);
  }

  /**
   * @param {string} instanceId
   * @returns {boolean}
   */
  stop(instanceId) {
    return this.effects.stop(instanceId);
  }

  /**
   * @param {number} deltaTime
   */
  update(deltaTime) {
    this.effects.update(deltaTime);
  }

  /**
   * @param {CanvasRenderingContext2D} [context]
   * @returns {number}
   */
  render(context = this.context) {
    return this.effects.render(context);
  }

  /**
   * @returns {{instanceCount: number, particleCount: number, drawCount: number}}
   */
  getStats() {
    return this.effects.getStats();
  }

  destroy() {
    this.effects.destroy();
  }
}

/**
 * @param {HTMLCanvasElement|CanvasRenderingContext2D} target
 * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}}
 */
function resolveCanvasTarget(target) {
  if (isCanvasContext(target)) {
    return {
      canvas: target.canvas,
      context: target,
    };
  }

  if (isCanvasElement(target)) {
    const context = target.getContext('2d');

    if (!context) {
      throw new Error('NovaFX requires a 2D canvas context.');
    }

    return {
      canvas: target,
      context,
    };
  }

  throw new Error('NovaFX requires an HTMLCanvasElement or CanvasRenderingContext2D target.');
}

/**
 * @param {unknown} target
 * @returns {boolean}
 */
function isCanvasElement(target) {
  return Boolean(target && typeof target === 'object' && typeof target.getContext === 'function');
}

/**
 * @param {unknown} target
 * @returns {boolean}
 */
function isCanvasContext(target) {
  return Boolean(target && typeof target === 'object' && 'canvas' in target && typeof target.fillRect === 'function');
}