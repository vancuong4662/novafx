import { BUILT_IN_PARTICLE_SHAPES } from './builtInParticleShapes.js';

export class AssetManager {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.loader = options.loader ?? loadImage;
    this.assets = new Map();
    this.registerBuiltIns(options.builtInShapes ?? BUILT_IN_PARTICLE_SHAPES);
  }

  /**
   * @param {Array<{id: string, src: string}>} shapes
   */
  registerBuiltIns(shapes) {
    for (const shape of shapes) {
      this.registerAsset(shape.id, shape.src);
    }
  }

  /**
   * @param {string} id
   * @param {string|Object} asset
   */
  registerAsset(id, asset) {
    if (!id || typeof id !== 'string') {
      throw new Error('Asset id must be a non-empty string.');
    }

    const existing = this.assets.get(id);
    const entry = createAssetEntry(id, asset);

    if (existing?.image && existing.src === entry.src) {
      entry.image = existing.image;
      entry.status = existing.status;
      entry.promise = existing.promise;
      entry.refCount = existing.refCount;
    }

    this.assets.set(id, entry);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this.assets.has(id);
  }

  /**
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    return this.assets.get(id)?.image ?? null;
  }

  /**
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async load(id) {
    const entry = this.assets.get(id);

    if (!entry) {
      throw new Error(`Asset not registered: ${id}`);
    }

    entry.refCount += 1;

    if (entry.image) {
      return entry.image;
    }

    if (!entry.promise) {
      entry.status = 'loading';
      entry.promise = this.loader(entry.src).then((image) => {
        entry.image = image;
        entry.status = 'loaded';
        return image;
      });
    }

    return entry.promise;
  }

  /**
   * @param {string} id
   */
  release(id) {
    const entry = this.assets.get(id);

    if (!entry) {
      return;
    }

    entry.refCount = Math.max(entry.refCount - 1, 0);
  }

  destroy() {
    for (const entry of this.assets.values()) {
      entry.image = null;
      entry.promise = null;
      entry.status = 'idle';
      entry.refCount = 0;
    }
  }
}

/**
 * @param {string} id
 * @param {string|Object} asset
 * @returns {Object}
 */
function createAssetEntry(id, asset) {
  if (typeof asset === 'string') {
    return {
      id,
      src: asset,
      image: null,
      promise: null,
      status: 'idle',
      refCount: 0,
    };
  }

  if (asset?.image) {
    return {
      id,
      src: asset.src ?? null,
      image: asset.image,
      promise: null,
      status: 'loaded',
      refCount: 0,
    };
  }

  if (typeof asset?.src === 'string') {
    return {
      id,
      src: asset.src,
      image: null,
      promise: null,
      status: 'idle',
      refCount: 0,
    };
  }

  throw new Error(`Asset ${id} requires a src or image.`);
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  if (typeof Image === 'undefined') {
    return Promise.reject(new Error('Image loading is not available in this environment.'));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset image: ${src}`));
    image.src = src;
  });
}