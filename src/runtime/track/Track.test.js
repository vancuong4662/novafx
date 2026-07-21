import { describe, expect, it } from 'vitest';
import { Track } from './Track.js';

describe('Track', () => {
  it('binds and interpolates numeric properties', () => {
    const particle = { size: 2, age: 0 };
    const track = new Track({ property: 'size', from: 2, to: 10, duration: 2 });

    track.bind(particle);
    particle.age = 1;
    track.update(particle);

    expect(particle.size).toBe(6);
  });

  it('applies random change to numeric target values', () => {
    const particle = { size: 2, age: 0 };
    const track = new Track(
      { property: 'size', from: 2, to: 10, duration: 1, randomChange: { min: 1, max: 3 } },
      { random: () => 0.5 },
    );

    track.bind(particle);
    particle.age = 1;
    track.update(particle);

    expect(particle.size).toBe(12);
  });

  it('maps direction track to particle angle', () => {
    const particle = { angle: 0, age: 0 };
    const track = new Track({ property: 'direction', from: 0, to: Math.PI, duration: 1 });

    track.bind(particle);
    particle.age = 0.5;
    track.update(particle);

    expect(particle.angle).toBe(Math.PI / 2);
  });

  it('interpolates hex colors', () => {
    const particle = { color: '#000000', age: 0 };
    const track = new Track({ property: 'color', from: '#000000', to: '#ffffff', duration: 1 });

    track.bind(particle);
    particle.age = 0.25;
    track.update(particle);

    expect(particle.color).toBe('rgb(64, 64, 64)');
  });

  it('moves through multiple phases when each phase end condition completes', () => {
    const particle = { alpha: 0, age: 0, lifetime: 2 };
    const track = new Track({
      property: 'alpha',
      phases: [
        { from: 0, to: 1, duration: 0.5, endCondition: { type: 'duration' } },
        { from: 1, to: 0.5, duration: 0.5, endCondition: { type: 'targetReached' } },
        { from: 0.5, to: 0, duration: 1, endCondition: { type: 'lifetimePercentage', value: 1 } },
      ],
    });

    track.bind(particle);
    particle.age = 0.5;
    track.update(particle);
    expect(track.currentPhaseIndex).toBe(1);

    particle.age = 1;
    track.update(particle);
    expect(track.currentPhaseIndex).toBe(2);

    particle.age = 1.5;
    track.update(particle);
    expect(particle.alpha).toBe(0.25);
  });

  it('supports manual phase transition at data level', () => {
    const particle = { size: 1, age: 0 };
    const track = new Track({
      property: 'size',
      phases: [
        { from: 1, to: 2, duration: 1, endCondition: { type: 'manual' } },
        { from: 2, to: 4, duration: 1, endCondition: { type: 'duration' } },
      ],
    });

    track.bind(particle);
    particle.age = 10;
    track.update(particle);
    expect(track.currentPhaseIndex).toBe(0);

    track.manualNext(particle);
    expect(track.currentPhaseIndex).toBe(1);
  });

  it('uses default final alpha behavior when the last phase omits target', () => {
    const particle = { alpha: 1, age: 0 };
    const track = new Track({
      property: 'alpha',
      phases: [{ from: 1, duration: 1, endCondition: { type: 'duration' } }],
    });

    track.bind(particle);
    particle.age = 0.5;
    track.update(particle);

    expect(particle.alpha).toBe(0.5);
  });
});