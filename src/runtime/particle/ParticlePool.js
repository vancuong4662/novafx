import { Particle } from './Particle.js';

export class ParticlePool {
  constructor() {
    this.available = [];
    this.createdCount = 0;
  }

  /**
   * @param {Object} descriptor
   * @param {Function} [random]
   * @returns {Particle}
   */
  acquire(descriptor, random = Math.random) {
    const particle = this.available.pop() ?? this.createParticle();
    particle.reset(descriptor, random);
    return particle;
  }

  /**
   * @param {Particle} particle
   */
  release(particle) {
    particle.recycle();
    this.available.push(particle);
  }

  /**
   * @returns {Particle}
   */
  createParticle() {
    this.createdCount += 1;
    return new Particle();
  }
}