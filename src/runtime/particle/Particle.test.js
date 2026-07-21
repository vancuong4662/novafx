import { describe, expect, it } from 'vitest';
import { Particle } from './Particle.js';

describe('Particle', () => {
  it('resets from a spawn descriptor with transform, lifetime, sprite, and tracks', () => {
    const particle = new Particle();

    particle.reset({
      emitterId: 'spark',
      position: { x: 10, y: 20 },
      particle: {
        lifetime: 0.5,
        size: 6,
        speed: 10,
        angle: Math.PI / 2,
        rotation: 0.25,
        scale: 2,
        spriteId: 'soft-circle',
        tracks: [{ property: 'alpha' }],
      },
    });

    expect(particle.active).toBe(true);
    expect(particle.emitterId).toBe('spark');
    expect(particle.x).toBe(10);
    expect(particle.y).toBe(20);
    expect(particle.lifetime).toBe(0.5);
    expect(particle.size).toBe(6);
    expect(particle.rotation).toBe(0.25);
    expect(particle.scale).toBe(2);
    expect(particle.spriteId).toBe('soft-circle');
    expect(particle.tracks).toHaveLength(1);
    expect(particle.tracks[0].property).toBe('alpha');
  });

  it('updates movement and becomes dead after lifetime', () => {
    const particle = new Particle();

    particle.reset({
      emitterId: 'spark',
      position: { x: 0, y: 0 },
      particle: { lifetime: 0.5, speed: 10, angle: 0 },
    });

    particle.update(0.25);
    expect(particle.x).toBe(2.5);
    expect(particle.y).toBe(0);
    expect(particle.isAlive()).toBe(true);

    particle.update(0.25);
    expect(particle.isAlive()).toBe(false);
  });

  it('keeps nova_point particles rotated toward their emitter target with an offset', () => {
    const particle = new Particle();

    particle.reset({
      emitterId: 'nova',
      position: { x: 0, y: 0 },
      rotationTarget: { x: 0, y: 0 },
      rotationOffset: Math.PI / 2,
      particle: { lifetime: 1, speed: 10, angle: 0 },
    });

    particle.update(0.5);

    expect(particle.x).toBe(5);
    expect(particle.y).toBe(0);
    expect(particle.rotation).toBeCloseTo(Math.PI + Math.PI / 2);
  });

  it('applies nova_point distance offset along the initial particle angle', () => {
    const particle = new Particle();

    particle.reset(
      {
        emitterId: 'nova',
        position: { x: 10, y: 20 },
        rotationTarget: { x: 10, y: 20 },
        distanceOffset: { min: 4, max: 8 },
        particle: { lifetime: 1, speed: 0, angle: Math.PI / 2 },
      },
      () => 0.5,
    );

    expect(particle.x).toBeCloseTo(10);
    expect(particle.y).toBeCloseTo(26);
    expect(particle.distanceOffset).toBe(6);
  });

  it('updates alpha, size, rotation, speed, direction, gravity, and color tracks', () => {
    const particle = new Particle();

    particle.reset({
      emitterId: 'spark',
      position: { x: 0, y: 0 },
      particle: {
        lifetime: 2,
        alpha: 1,
        size: 2,
        rotation: 0,
        speed: 0,
        angle: 0,
        gravity: 0,
        color: '#000000',
        tracks: [
          { property: 'alpha', from: 1, to: 0, duration: 1 },
          { property: 'size', from: 2, to: 6, duration: 1 },
          { property: 'rotation', from: 0, to: 10, duration: 1 },
          { property: 'speed', from: 0, to: 20, duration: 1 },
          { property: 'direction', from: 0, to: Math.PI / 2, duration: 1 },
          { property: 'gravity', from: 0, to: 40, duration: 1 },
          { property: 'color', from: '#000000', to: '#ffffff', duration: 1 },
        ],
      },
    });

    particle.update(0.5);

    expect(particle.alpha).toBe(0.5);
    expect(particle.size).toBe(4);
    expect(particle.rotation).toBe(5);
    expect(particle.speed).toBe(10);
    expect(particle.angle).toBe(Math.PI / 4);
    expect(particle.gravity).toBe(20);
    expect(particle.color).toBe('rgb(128, 128, 128)');
  });
});