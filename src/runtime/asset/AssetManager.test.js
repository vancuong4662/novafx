import { describe, expect, it, vi } from 'vitest';
import { AssetManager } from './AssetManager.js';

describe('AssetManager', () => {
  it('registers built-in particle shape ids', () => {
    const manager = new AssetManager({ loader: vi.fn() });

    expect(manager.has('circle')).toBe(true);
    expect(manager.has('soft-circle')).toBe(true);
    expect(manager.has('ring')).toBe(true);
    expect(manager.has('pixel')).toBe(true);
    expect(manager.has('star')).toBe(true);
    expect(manager.has('spark')).toBe(true);
    expect(manager.has('smoke')).toBe(true);
    expect(manager.has('line')).toBe(true);
    expect(manager.has('square')).toBe(true);
    expect(manager.has('diamond')).toBe(true);
    expect(manager.has('hexagon')).toBe(true);
    expect(manager.has('snow')).toBe(true);
    expect(manager.has('dot')).toBe(true);
  });

  it('loads and caches each image once by asset id', async () => {
    const image = { width: 16, height: 16 };
    const loader = vi.fn(async () => image);
    const manager = new AssetManager({ loader, builtInShapes: [] });

    manager.registerAsset('spark', '/img/particleShapes/spark.png');

    const firstImage = await manager.load('spark');
    const secondImage = await manager.load('spark');

    expect(firstImage).toBe(image);
    expect(secondImage).toBe(image);
    expect(manager.get('spark')).toBe(image);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith('/img/particleShapes/spark.png');
  });

  it('supports custom assets registered with an existing image reference', async () => {
    const image = { width: 32, height: 32 };
    const loader = vi.fn();
    const manager = new AssetManager({ loader, builtInShapes: [] });

    manager.registerAsset('custom-rune', { image });

    await expect(manager.load('custom-rune')).resolves.toBe(image);
    expect(manager.get('custom-rune')).toBe(image);
    expect(loader).not.toHaveBeenCalled();
  });
});