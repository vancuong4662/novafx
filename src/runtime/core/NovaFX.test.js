import { describe, expect, it, vi } from 'vitest';
import { NovaFX } from './NovaFX.js';

const effectTemplate = {
  id: 'explosion',
  version: 1,
  duration: 1,
  surface: {
    width: 128,
    height: 128,
    blendMode: 'source-over',
  },
  emitters: [],
};

function createCanvas() {
  const context = createContext();
  const canvas = {
    width: 320,
    height: 240,
    getContext: vi.fn(() => context),
  };
  context.canvas = canvas;
  return canvas;
}

function createContext() {
  return {
    canvas: { width: 320, height: 240 },
    fillStyle: '#000000',
    globalCompositeOperation: 'source-over',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
  };
}

function createSurfaceFactory() {
  return vi.fn((width, height) => ({
    width,
    height,
    getContext: () => ({
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
    }),
  }));
}

describe('NovaFX', () => {
  it('accepts a canvas element target and exposes the runtime API', async () => {
    const canvas = createCanvas();
    const fx = new NovaFX(canvas, { surfaceFactory: createSurfaceFactory() });

    await fx.load(effectTemplate);
    const instanceId = fx.play('explosion', 10, 20);

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(instanceId).toBe('fx-1');
    expect(fx.getStats().instanceCount).toBe(1);
    expect(fx.stop(instanceId)).toBe(true);
    expect(fx.stop(instanceId)).toBe(false);
    expect(fx.getStats()).toEqual({ instanceCount: 0, particleCount: 0, drawCount: 0 });
  });

  it('accepts a canvas 2D context target and returns draw count from render', async () => {
    const context = createContext();
    const fx = new NovaFX(context, { surfaceFactory: createSurfaceFactory() });

    await fx.load(effectTemplate);
    fx.play('explosion', 10, 20);
    fx.update(0.016);

    expect(fx.canvas).toBe(context.canvas);
    expect(fx.render()).toBe(0);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 320, 240);
  });

  it('throws a useful error for invalid targets', () => {
    expect(() => new NovaFX(null)).toThrow(
      'NovaFX requires an HTMLCanvasElement or CanvasRenderingContext2D target.',
    );
  });
});