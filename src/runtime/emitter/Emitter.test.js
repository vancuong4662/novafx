import { describe, expect, it } from 'vitest';
import { Emitter } from './Emitter.js';

describe('Emitter', () => {
  it('emits a burst once from a point shape', () => {
    const emitter = new Emitter({
      id: 'flash',
      enabled: true,
      shape: { type: 'point', x: 12, y: -8 },
      emission: { type: 'burst', count: 3, startTime: 0 },
    });

    expect(emitter.update(0.016, 0, 0.016)).toEqual([
      { emitterId: 'flash', position: { x: 12, y: -8 }, particle: {} },
      { emitterId: 'flash', position: { x: 12, y: -8 }, particle: {} },
      { emitterId: 'flash', position: { x: 12, y: -8 }, particle: {} },
    ]);
    expect(emitter.update(0.016, 0.016, 0.032)).toEqual([]);
  });

  it('emits continuously based on rate', () => {
    const emitter = new Emitter({
      id: 'smoke',
      shape: { type: 'point' },
      emission: { type: 'continuous', rate: 10 },
    });

    expect(emitter.update(0.05, 0, 0.05)).toHaveLength(0);
    expect(emitter.update(0.05, 0.05, 0.1)).toHaveLength(1);
  });

  it('emits on an interval when loop is enabled', () => {
    const emitter = new Emitter({
      id: 'spark',
      shape: { type: 'point' },
      emission: { type: 'interval', count: 2, interval: 0.1, loop: true },
    });

    expect(emitter.update(0.016, 0, 0.016)).toHaveLength(2);
    expect(emitter.update(0.1, 0.016, 0.116)).toHaveLength(2);
  });

  it('supports circle, line, and box spawn shapes', () => {
    const randomValues = [0, 1, 0.5, 0.25, 0.75, 0.5];
    const random = () => randomValues.shift() ?? 0;

    const circle = new Emitter({
      id: 'circle',
      shape: { type: 'circle', x: 10, y: 20, radius: 5 },
      emission: { type: 'burst', count: 1 },
    }, { random });
    const line = new Emitter({
      id: 'line',
      shape: { type: 'line', x1: 0, y1: 10, x2: 10, y2: 20 },
      emission: { type: 'burst', count: 1 },
    }, { random });
    const box = new Emitter({
      id: 'box',
      shape: { type: 'box', x: 4, y: 8, width: 20, height: 10 },
      emission: { type: 'burst', count: 1 },
    }, { random });

    expect(circle.update(0.016, 0, 0.016)[0].position).toEqual({ x: 15, y: 20 });
    expect(line.update(0.016, 0, 0.016)[0].position).toEqual({ x: 5, y: 15 });
    expect(box.update(0.016, 0, 0.016)[0].position).toEqual({ x: 9, y: 15.5 });
  });

  it('can loop burst emission by interval', () => {
    const emitter = new Emitter({
      id: 'pulse',
      shape: { type: 'point' },
      emission: { type: 'burst', count: 1, interval: 0.2, loop: true },
    });

    expect(emitter.update(0.016, 0, 0.016)).toHaveLength(1);
    expect(emitter.update(0.1, 0.016, 0.116)).toHaveLength(0);
    expect(emitter.update(0.1, 0.116, 0.216)).toHaveLength(1);
  });

  it('adds particle config to spawn descriptors without rendering particles', () => {
    const emitter = new Emitter({
      id: 'dust',
      shape: { type: 'point', x: 1, y: 2 },
      emission: { type: 'burst', count: 1 },
      particle: { lifetime: 0.4, size: { min: 2, max: 6 }, speed: 12 },
    });

    expect(emitter.update(0.016, 0, 0.016)).toEqual([
      {
        emitterId: 'dust',
        position: { x: 1, y: 2 },
        particle: { lifetime: 0.4, size: { min: 2, max: 6 }, speed: 12 },
      },
    ]);
  });

  it('can append emitted descriptors into a reusable output array', () => {
    const output = [];
    const emitter = new Emitter({
      id: 'spark',
      shape: { type: 'point', x: 2, y: 3 },
      emission: { type: 'burst', count: 1 },
    });

    const emitted = emitter.emit(0.016, 0, 0.016, output);

    expect(emitted).toBe(output);
    expect(output).toEqual([{ emitterId: 'spark', position: { x: 2, y: 3 }, particle: {} }]);

    output.length = 0;
    expect(emitter.emit(0.016, 0.016, 0.032, output)).toBe(output);
    expect(output).toEqual([]);
  });
});