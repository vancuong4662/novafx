import { Phase } from '../phase/Phase.js';

const TRACK_PROPERTY_MAP = {
  alpha: 'alpha',
  size: 'size',
  rotation: 'rotation',
  speed: 'speed',
  direction: 'angle',
  gravity: 'gravity',
  color: 'color',
};

export class Track {
  /**
   * @param {Object} config
   * @param {Object} [options]
   */
  constructor(config, options = {}) {
    this.property = config.property;
    this.targetProperty = TRACK_PROPERTY_MAP[this.property] ?? this.property;
    this.random = options.random ?? Math.random;
    this.currentPhaseIndex = 0;
    this.phases = this.createPhases(config);
  }

  /**
   * @param {Object} particle
   */
  bind(particle) {
    this.currentPhaseIndex = 0;
    this.currentPhase?.bind(particle, particle.age);
  }

  /**
   * @param {Object} particle
   */
  update(particle) {
    const phase = this.currentPhase;

    if (!phase) {
      return;
    }

    phase.update(particle);

    if (phase.isComplete(particle) && this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex += 1;
      this.currentPhase.bind(particle, particle.age);
    }
  }

  /**
   * @returns {Phase|null}
   */
  get currentPhase() {
    return this.phases[this.currentPhaseIndex] ?? null;
  }

  /**
   * @param {Object} config
   * @returns {Phase[]}
   */
  createPhases(config) {
    const phaseConfigs = Array.isArray(config.phases)
      ? config.phases
      : [
          {
            from: config.from,
            to: config.to,
            duration: config.duration,
            randomChange: config.randomChange,
            endCondition: config.endCondition,
          },
        ];

    return phaseConfigs.map(
      (phaseConfig, index) =>
        new Phase(phaseConfig, {
          property: this.property,
          targetProperty: this.targetProperty,
          random: this.random,
          isLast: index === phaseConfigs.length - 1,
        }),
    );
  }

  manualNext(particle) {
    if (this.currentPhase?.endCondition.type !== 'manual') {
      return;
    }

    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex += 1;
      this.currentPhase.bind(particle, particle.age);
    }
  }
}

/**
 * @param {Object[]} trackConfigs
 * @param {Object} [options]
 * @returns {Track[]}
 */
export function createTracks(trackConfigs, options = {}) {
  if (!Array.isArray(trackConfigs)) {
    return [];
  }

  return trackConfigs.map((trackConfig) => new Track(trackConfig, options));
}
