import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../asset/AssetManager.js';
import { EffectManager } from './EffectManager.js';

const explosionTemplate = {
  id: 'explosion',
  version: 1,
  duration: 1,
  surface: {
    width: 256,
    height: 256,
    blendMode: 'source-over',
  },
  emitters: [],
};

function createSurfaceFactory() {
  return vi.fn((width, height) => ({
    width,
    height,
    getContext: () => ({
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
        fill: vi.fn(),
      fillText: vi.fn(),
        drawImage: vi.fn(),
    }),
  }));
}

function createRenderContext() {
  return {
    canvas: { width: 320, height: 240 },
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
}

function createManager(options = {}) {
  return new EffectManager(null, {
    surfaceFactory: createSurfaceFactory(),
    ...options,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EffectManager', () => {
  it('loads a template object and plays an independent instance', async () => {
    const manager = createManager();

    await manager.load(explosionTemplate);
    const instanceId = manager.play('explosion', 10, 20);

    expect(instanceId).toBe('fx-1');
    expect(manager.instances.size).toBe(1);
  });

  it('removes completed instances during update', async () => {
    const manager = createManager();

    await manager.load({ ...explosionTemplate, id: 'flash', duration: 0.5 });
    manager.play('flash', 0, 0);
    manager.update(0.6);

    expect(manager.instances.size).toBe(0);
  });

  it('clears templates and instances on destroy', async () => {
    const manager = createManager();

    await manager.load({ ...explosionTemplate, id: 'spark' });
    manager.play('spark', 0, 0);
    manager.destroy();

    expect(manager.templates.size).toBe(0);
    expect(manager.instances.size).toBe(0);
  });

  it('caches loaded URLs and parses each URL once', async () => {
    const parseTemplate = vi.fn((templateData, options) => ({
      id: templateData.id,
      version: templateData.version,
      name: templateData.name ?? templateData.id,
      duration: templateData.duration,
      surface: templateData.surface,
      emitters: templateData.emitters,
      source: options.source,
      clone() {
        return {
          id: this.id,
          version: this.version,
          name: this.name,
          duration: this.duration,
          surface: { ...this.surface },
          emitters: [...this.emitters],
          source: this.source,
        };
      },
    }));
    const manager = createManager({ parseTemplate });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => explosionTemplate,
      })),
    );

    const firstTemplate = await manager.load('effects/explosion.json');
    const secondTemplate = await manager.load('effects/explosion.json');

    expect(firstTemplate).toBe(secondTemplate);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(parseTemplate).toHaveBeenCalledTimes(1);
  });

  it('throws a useful error for missing required fields', async () => {
    const manager = createManager();

    await expect(manager.load({ id: 'broken' })).rejects.toThrow(
      'Effect template requires number field: version.',
    );
  });

  it('creates a separate surface for each played instance', async () => {
    const surfaceFactory = createSurfaceFactory();
    const manager = createManager({ surfaceFactory });

    await manager.load(explosionTemplate);
    manager.play('explosion', 10, 20);
    manager.play('explosion', 30, 40);

    expect(surfaceFactory).toHaveBeenCalledTimes(2);
    expect(manager.instances.size).toBe(2);
  });

  it('preloads particle sprite assets from templates before playing instances', async () => {
    const image = { width: 16, height: 16 };
    const loader = vi.fn(async () => image);
    const assetManager = new AssetManager({ loader });
    const manager = createManager({ assetManager });

    await manager.load({
      ...explosionTemplate,
      emitters: [
        {
          id: 'spark',
          particle: {
            spriteId: 'circle',
          },
        },
      ],
    });
    const instanceId = manager.play('explosion', 0, 0);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith('/img/particleShapes/round.png');
    expect(assetManager.get('circle')).toBe(image);
    expect(manager.instances.get(instanceId).assetManager).toBe(assetManager);
  });

  it('reports debug stats for multiple running instances without leaking particles', async () => {
    const manager = createManager();
    const context = createRenderContext();

    await manager.load({
      ...explosionTemplate,
      duration: 0.2,
      emitters: [
        {
          id: 'flash',
          shape: { type: 'point' },
          emission: { type: 'burst', count: 2 },
          particle: { lifetime: 0.05 },
        },
      ],
    });

    manager.play('explosion', 10, 20);
    manager.play('explosion', 30, 40);
    manager.update(0.016);
    manager.render(context);

    expect(manager.getStats()).toEqual({
      instanceCount: 2,
      particleCount: 4,
      drawCount: 6,
    });

    manager.update(0.05);
    manager.render(context);

    expect(manager.getStats()).toEqual({
      instanceCount: 2,
      particleCount: 0,
      drawCount: 0,
    });

    manager.update(0.2);

    expect(manager.getStats()).toEqual({
      instanceCount: 0,
      particleCount: 0,
      drawCount: 0,
    });
  });
});