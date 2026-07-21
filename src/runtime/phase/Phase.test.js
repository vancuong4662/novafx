import { describe, expect, it } from 'vitest';
import { Phase } from './Phase.js';

describe('Phase', () => {
  it('completes by duration', () => {
    const particle = { size: 2, age: 0 };
    const phase = new Phase(
      { from: 2, to: 10, duration: 1, endCondition: { type: 'duration' } },
      { property: 'size', targetProperty: 'size' },
    );

    phase.bind(particle, 0);
    particle.age = 1;
    phase.update(particle);

    expect(particle.size).toBe(10);
    expect(phase.isComplete(particle)).toBe(true);
  });

  it('completes by target reached', () => {
    const particle = { size: 2, age: 0 };
    const phase = new Phase(
      { from: 2, to: 4, duration: 0.5, endCondition: { type: 'targetReached' } },
      { property: 'size', targetProperty: 'size' },
    );

    phase.bind(particle, 0);
    particle.age = 0.5;
    phase.update(particle);

    expect(phase.isComplete(particle)).toBe(true);
  });

  it('completes by lifetime percentage', () => {
    const particle = { alpha: 1, age: 0.5, lifetime: 2 };
    const phase = new Phase(
      { from: 1, to: 0, duration: 1, endCondition: { type: 'lifetimePercentage', value: 0.25 } },
      { property: 'alpha', targetProperty: 'alpha' },
    );

    phase.bind(particle, 0);

    expect(phase.isComplete(particle)).toBe(true);
  });

  it('does not complete manual phases automatically', () => {
    const particle = { alpha: 1, age: 10 };
    const phase = new Phase(
      { from: 1, to: 0, duration: 1, endCondition: { type: 'manual' } },
      { property: 'alpha', targetProperty: 'alpha' },
    );

    phase.bind(particle, 0);
    phase.update(particle);

    expect(phase.isComplete(particle)).toBe(false);
  });
});