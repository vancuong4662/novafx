import { describe, expect, it, vi } from 'vitest';
import { EffectInstance } from './EffectInstance.js';

const template = {
  id: 'explosion',
  name: 'Explosion',
  duration: 1,
  surface: {
    width: 256,
    height: 128,
    blendMode: 'lighter',
  },
  emitters: [],
};

function createSurfaceContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  };
}

function createMainContext() {
  return {
    globalCompositeOperation: 'source-over',
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
}

function createSurfaceFactory(surfaceContext = createSurfaceContext()) {
  return vi.fn((width, height) => ({
    width,
    height,
    getContext: () => surfaceContext,
  }));
}

function createTintCanvasFactory(tintContext = createSurfaceContext()) {
  const tintCanvas = {
    width: 0,
    height: 0,
    getContext: () => tintContext,
  };

  return {
    tintCanvas,
    tintContext,
    tintCanvasFactory: vi.fn((width, height) => {
      tintCanvas.width = width;
      tintCanvas.height = height;
      return tintCanvas;
    }),
  };
}

describe('EffectInstance', () => {
  it('creates a particle surface from template surface data', () => {
    const surfaceFactory = createSurfaceFactory();
    const instance = new EffectInstance('fx-1', template, 10, 20, { surfaceFactory });

    expect(surfaceFactory).toHaveBeenCalledWith(256, 128);
    expect(instance.surface.width).toBe(256);
    expect(instance.surface.height).toBe(128);
  });

  it('renders to particle surface before drawing the surface on the main canvas', () => {
    const surfaceContext = createSurfaceContext();
    const surfaceFactory = createSurfaceFactory(surfaceContext);
    const mainContext = createMainContext();
    const instance = new EffectInstance('fx-1', template, 64, 72, {
      rotation: 0.5,
      scale: 2,
      surfaceFactory,
    });
    instance.particles = [
      {
        x: 0,
        y: 0,
        size: 4,
        scale: 1,
        alpha: 1,
        rotation: 0,
        color: '#ffffff',
        blendMode: 'source-over',
        spriteId: null,
      },
    ];

    instance.render(mainContext);

    expect(surfaceContext.clearRect).toHaveBeenCalledWith(0, 0, 256, 128);
    expect(surfaceContext.translate).toHaveBeenCalledWith(128, 64);
    expect(mainContext.translate).toHaveBeenCalledWith(64, 72);
    expect(mainContext.rotate).toHaveBeenCalledWith(0.5);
    expect(mainContext.scale).toHaveBeenCalledWith(2, 2);
    expect(mainContext.drawImage).toHaveBeenCalledWith(instance.surface.canvas, -128, -64);
    expect(mainContext.globalCompositeOperation).toBe('source-over');
  });

  it('skips drawing blank instance surfaces when no particles are visible', () => {
    const surfaceContext = createSurfaceContext();
    const surfaceFactory = createSurfaceFactory(surfaceContext);
    const mainContext = createMainContext();
    const instance = new EffectInstance('fx-1', template, 64, 72, { surfaceFactory });

    const drawCount = instance.render(mainContext);

    expect(drawCount).toBe(0);
    expect(surfaceContext.clearRect).toHaveBeenCalledWith(0, 0, 256, 128);
    expect(mainContext.drawImage).not.toHaveBeenCalled();
  });

  it('destroys its particle surface without mutating template data', () => {
    const surfaceFactory = createSurfaceFactory();
    const instance = new EffectInstance('fx-1', template, 10, 20, { surfaceFactory });

    instance.x = 99;
    instance.rotation = 1;
    instance.scale = 3;
    instance.destroy();

    expect(instance.surface.destroyed).toBe(true);
    expect(template.surface.width).toBe(256);
    expect(template.surface.height).toBe(128);
  });

  it('updates multiple emitters and spawns particles through the particle pool', () => {
    const instance = new EffectInstance(
      'fx-1',
      {
        ...template,
        emitters: [
          {
            id: 'flash',
            enabled: true,
            shape: { type: 'point', x: 1, y: 2 },
            emission: { type: 'burst', count: 2 },
          },
          {
            id: 'sparks',
            enabled: true,
            shape: { type: 'point', x: 3, y: 4 },
            emission: { type: 'burst', count: 1 },
          },
        ],
      },
      10,
      20,
      { surfaceFactory: createSurfaceFactory() },
    );

    instance.update(0.016);

    expect(instance.particles).toHaveLength(3);
    expect(instance.particles.map((particle) => particle.emitterId)).toEqual([
      'flash',
      'flash',
      'sparks',
    ]);
    expect(instance.particles[0].x).toBe(1);
    expect(instance.particles[0].y).toBe(2);
    expect(instance.particlePool.createdCount).toBe(3);
  });

  it('does not rotate the whole effect instance during update unless configured externally', () => {
    const instance = new EffectInstance(
      'fx-1',
      {
        ...template,
        emitters: [
          {
            id: 'flash',
            enabled: true,
            shape: { type: 'point', x: 0, y: 0 },
            emission: { type: 'burst', count: 1 },
          },
        ],
      },
      10,
      20,
      { rotation: 0.75, surfaceFactory: createSurfaceFactory() },
    );

    instance.update(0.5);

    expect(instance.rotation).toBe(0.75);
  });

  it('recycles particles when their lifetime ends', () => {
    const instance = new EffectInstance(
      'fx-1',
      {
        ...template,
        emitters: [
          {
            id: 'flash',
            enabled: true,
            shape: { type: 'point', x: 0, y: 0 },
            emission: { type: 'burst', count: 1 },
            particle: { lifetime: 0.05 },
          },
        ],
      },
      10,
      20,
      { surfaceFactory: createSurfaceFactory() },
    );

    instance.update(0.016);
    expect(instance.particles).toHaveLength(1);

    instance.update(0.05);

    expect(instance.particles).toHaveLength(0);
    expect(instance.particlePool.available).toHaveLength(1);
  });

  it('renders particles with cached sprite assets when spriteId resolves', () => {
    const image = { width: 16, height: 16 };
    const assetManager = {
      get: vi.fn(() => image),
    };
    const { tintCanvas, tintContext, tintCanvasFactory } = createTintCanvasFactory();
    const surfaceContext = createSurfaceContext();
    const instance = new EffectInstance('fx-1', template, 10, 20, {
      assetManager,
      tintCanvasFactory,
      surfaceFactory: createSurfaceFactory(surfaceContext),
    });

    instance.particles = [
      {
        x: 4,
        y: 6,
        size: 12,
        scale: 2,
        alpha: 0.5,
        rotation: 0.25,
        color: '#ffffff',
        spriteId: 'spark',
      },
    ];

    instance.renderToSurface();

    expect(assetManager.get).toHaveBeenCalledWith('spark');
    expect(tintCanvasFactory).toHaveBeenCalledWith(24, 24);
    expect(tintContext.drawImage).toHaveBeenCalledWith(image, 0, 0, 24, 24);
    expect(tintContext.globalCompositeOperation).toBe('source-in');
    expect(tintContext.fillStyle).toBe('#ffffff');
    expect(tintContext.fillRect).toHaveBeenCalledWith(0, 0, 24, 24);
    expect(surfaceContext.translate).toHaveBeenCalledWith(4, 6);
    expect(surfaceContext.rotate).toHaveBeenCalledWith(0.25);
    expect(surfaceContext.drawImage).toHaveBeenCalledWith(tintCanvas, -12, -12, 24, 24);
    expect(surfaceContext.arc).not.toHaveBeenCalled();
  });

  it('applies particle alpha, rotation, color, scale, and blend mode for fallback rendering', () => {
    const surfaceContext = createSurfaceContext();
    const instance = new EffectInstance('fx-1', template, 10, 20, {
      surfaceFactory: createSurfaceFactory(surfaceContext),
    });

    const drawCount = instance.renderParticle(
      surfaceContext,
      {
        x: 4,
        y: 6,
        size: 3,
        scale: 2,
        alpha: 0.5,
        rotation: 0.25,
        color: '#ff0000',
        blendMode: 'lighter',
        spriteId: null,
      },
      0.5,
    );

    expect(drawCount).toBe(1);
    expect(surfaceContext.globalAlpha).toBe(0.25);
    expect(surfaceContext.globalCompositeOperation).toBe('lighter');
    expect(surfaceContext.translate).toHaveBeenCalledWith(4, 6);
    expect(surfaceContext.rotate).toHaveBeenCalledWith(0.25);
    expect(surfaceContext.fillStyle).toBe('#ff0000');
    expect(surfaceContext.arc).toHaveBeenCalledWith(0, 0, 6, 0, Math.PI * 2);
  });
});