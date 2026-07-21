import { describe, expect, it } from 'vitest';
import { ParticlePool } from './ParticlePool.js';

describe('ParticlePool', () => {
  it('reuses released particle objects', () => {
    const pool = new ParticlePool();
    const firstParticle = pool.acquire({
      emitterId: 'spark',
      position: { x: 0, y: 0 },
      particle: { lifetime: 1 },
    });

    pool.release(firstParticle);
    const reusedParticle = pool.acquire({
      emitterId: 'smoke',
      position: { x: 5, y: 6 },
      particle: { lifetime: 2 },
    });

    expect(reusedParticle).toBe(firstParticle);
    expect(pool.createdCount).toBe(1);
    expect(reusedParticle.emitterId).toBe('smoke');
    expect(reusedParticle.x).toBe(5);
    expect(reusedParticle.y).toBe(6);
  });
});