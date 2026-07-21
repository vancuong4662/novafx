import { resolveRandomRange } from '../particle/randomRange.js';

export class Phase {
  /**
   * @param {Object} config
   * @param {Object} options
   */
  constructor(config, options) {
    this.property = options.property;
    this.targetProperty = options.targetProperty;
    this.from = config.from;
    this.to = config.to;
    this.duration = config.duration ?? 1;
    this.randomChange = config.randomChange;
    this.endCondition = config.endCondition ?? { type: 'duration' };
    this.random = options.random ?? Math.random;
    this.isLast = options.isLast === true;
    this.resolvedFrom = null;
    this.resolvedTo = null;
    this.startedAt = 0;
  }

  /**
   * @param {Object} particle
   * @param {number} startedAt
   */
  bind(particle, startedAt) {
    this.startedAt = startedAt;
    this.resolvedFrom = this.resolveValue(this.from, particle[this.targetProperty]);
    this.resolvedTo = this.resolveValue(this.to, this.getDefaultTarget(particle));

    if (this.randomChange !== undefined && typeof this.resolvedTo === 'number') {
      this.resolvedTo += resolveRandomRange(this.randomChange, 0, this.random);
    }

    particle[this.targetProperty] = this.resolvedFrom;
  }

  /**
   * @param {Object} particle
   */
  update(particle) {
    const progress = this.getProgress(particle);
    particle[this.targetProperty] = interpolateValue(this.resolvedFrom, this.resolvedTo, progress);
  }

  /**
   * @param {Object} particle
   * @returns {boolean}
   */
  isComplete(particle) {
    if (this.endCondition.type === 'manual') {
      return false;
    }

    if (this.endCondition.type === 'lifetimePercentage') {
      return particle.age / particle.lifetime >= this.endCondition.value;
    }

    if (this.endCondition.type === 'targetReached') {
      return hasReachedTarget(particle[this.targetProperty], this.resolvedTo);
    }

    return particle.age - this.startedAt >= this.duration;
  }

  /**
   * @param {Object} particle
   * @returns {number}
   */
  getProgress(particle) {
    if (this.endCondition.type === 'lifetimePercentage' && this.duration === undefined) {
      return Math.min(particle.age / particle.lifetime / this.endCondition.value, 1);
    }

    return this.duration <= 0 ? 1 : Math.min((particle.age - this.startedAt) / this.duration, 1);
  }

  /**
   * @param {Object} particle
   * @returns {unknown}
   */
  getDefaultTarget(particle) {
    if (this.to !== undefined) {
      return particle[this.targetProperty];
    }

    if (this.isLast && this.property === 'alpha') {
      return 0;
    }

    return particle[this.targetProperty];
  }

  /**
   * @param {unknown} value
   * @param {unknown} fallback
   * @returns {unknown}
   */
  resolveValue(value, fallback) {
    if (typeof value === 'number' || (value && typeof value === 'object' && 'min' in value)) {
      return resolveRandomRange(value, Number(fallback) || 0, this.random);
    }

    return value ?? fallback;
  }
}

/**
 * @param {unknown} from
 * @param {unknown} to
 * @param {number} progress
 * @returns {unknown}
 */
function interpolateValue(from, to, progress) {
  if (typeof from === 'number' && typeof to === 'number') {
    return from + (to - from) * progress;
  }

  if (typeof from === 'string' && typeof to === 'string') {
    return interpolateColor(from, to, progress);
  }

  return progress >= 1 ? to : from;
}

/**
 * @param {unknown} value
 * @param {unknown} target
 * @returns {boolean}
 */
function hasReachedTarget(value, target) {
  if (typeof value === 'number' && typeof target === 'number') {
    return Math.abs(value - target) <= 0.000001;
  }

  return value === target;
}

/**
 * @param {string} from
 * @param {string} to
 * @param {number} progress
 * @returns {string}
 */
function interpolateColor(from, to, progress) {
  const fromColor = parseHexColor(from);
  const toColor = parseHexColor(to);

  if (!fromColor || !toColor) {
    return progress >= 1 ? to : from;
  }

  const color = fromColor.map((channel, index) =>
    Math.round(channel + (toColor[index] - channel) * progress),
  );

  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

/**
 * @param {string} value
 * @returns {number[]|null}
 */
function parseHexColor(value) {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);

  if (!match) {
    return null;
  }

  return [Number.parseInt(match[1], 16), Number.parseInt(match[2], 16), Number.parseInt(match[3], 16)];
}