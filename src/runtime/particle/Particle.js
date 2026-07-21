import { resolveRandomRange } from './randomRange.js';
import { createTracks } from '../track/Track.js';

export class Particle {
  constructor() {
    this.active = false;
    this.emitterId = null;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scale = 1;
    this.size = 4;
    this.alpha = 1;
    this.color = '#f4cd69';
    this.speed = 0;
    this.angle = 0;
    this.gravity = 0;
    this.blendMode = 'source-over';
    this.velocityX = 0;
    this.velocityY = 0;
    this.rotationTarget = null;
    this.rotationOffset = 0;
    this.distanceOffset = 0;
    this.age = 0;
    this.lifetime = 1;
    this.spriteId = null;
    this.tracks = [];
  }

  /**
   * @param {Object} descriptor
   * @param {Function} [random]
   */
  reset(descriptor, random = Math.random) {
    const particleConfig = descriptor.particle ?? {};

    this.active = true;
    this.emitterId = descriptor.emitterId;
    this.x = descriptor.position.x;
    this.y = descriptor.position.y;
    this.rotation = resolveRandomRange(particleConfig.rotation, 0, random);
    this.scale = resolveRandomRange(particleConfig.scale, 1, random);
    this.size = resolveRandomRange(particleConfig.size, 4, random);
    this.alpha = resolveRandomRange(particleConfig.alpha, 1, random);
    this.color = particleConfig.color ?? '#f4cd69';
    this.speed = resolveRandomRange(particleConfig.speed, 0, random);
    this.angle = resolveRandomRange(particleConfig.angle, 0, random);
    this.gravity = resolveRandomRange(particleConfig.gravity, 0, random);
    this.blendMode = particleConfig.blendMode ?? 'source-over';
    this.velocityX = Math.cos(this.angle) * this.speed;
    this.velocityY = Math.sin(this.angle) * this.speed;
    this.rotationTarget = descriptor.rotationTarget ?? null;
    this.rotationOffset = resolveRandomRange(descriptor.rotationOffset, 0, random);
    this.distanceOffset = resolveRandomRange(descriptor.distanceOffset, 0, random);

    if (this.distanceOffset !== 0) {
      this.x += Math.cos(this.angle) * this.distanceOffset;
      this.y += Math.sin(this.angle) * this.distanceOffset;
    }

    this.age = 0;
    this.lifetime = resolveRandomRange(particleConfig.lifetime, 1, random);
    this.spriteId = particleConfig.spriteId ?? null;
    this.tracks = createTracks(particleConfig.tracks, { random });

    for (const track of this.tracks) {
      track.bind(this);
    }
  }

  /**
   * @param {number} deltaTime
   */
  update(deltaTime) {
    this.age += deltaTime;

    for (const track of this.tracks) {
      track.update(this);
    }

    this.velocityX = Math.cos(this.angle) * this.speed;
    this.velocityY += this.gravity * deltaTime;
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;
    this.updateFacingRotation();
  }

  updateFacingRotation() {
    if (!this.rotationTarget) {
      return;
    }

    this.rotation = Math.atan2(this.rotationTarget.y - this.y, this.rotationTarget.x - this.x) + this.rotationOffset;
  }

  /**
   * @returns {boolean}
   */
  isAlive() {
    return this.active && this.age < this.lifetime;
  }

  recycle() {
    this.active = false;
    this.emitterId = null;
    this.spriteId = null;
    this.blendMode = 'source-over';
    this.rotationTarget = null;
    this.rotationOffset = 0;
    this.distanceOffset = 0;
    this.tracks = [];
  }
}