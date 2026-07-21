import { AssetManager } from '../asset/AssetManager.js';
import { EffectInstance } from './EffectInstance.js';
import { parseEffectTemplate } from './parseEffectTemplate.js';

export class EffectManager {
  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Object} [options]
   */
  constructor(context, options = {}) {
    this.context = context;
    this.options = {
      backgroundColor: '#070807',
      clearCanvas: true,
      showIdleState: true,
      ...options,
    };
    this.parseTemplate = options.parseTemplate ?? parseEffectTemplate;
    this.surfaceFactory = options.surfaceFactory;
    this.assetManager = options.assetManager ?? new AssetManager(options.assetManagerOptions);
    this.templates = new Map();
    this.templateSources = new Map();
    this.instances = new Map();
    this.nextInstanceId = 1;
    this.stats = {
      instanceCount: 0,
      particleCount: 0,
      drawCount: 0,
    };
    this.registerAssets(options.assets);
  }

  /**
   * @param {string|Object} effectSource
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async load(effectSource, options = {}) {
    if (typeof effectSource === 'string') {
      return this.loadTemplateFromUrl(effectSource, options);
    }

    this.registerAssets(options.assets);
    const template = this.parseTemplate(effectSource, options);
    await this.preloadTemplateAssets(template);

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * @param {string} effectId
   * @param {number} x
   * @param {number} y
   * @param {Object} [options]
   * @returns {string}
   */
  play(effectId, x, y, options = {}) {
    const template = this.templates.get(effectId);

    if (!template) {
      throw new Error(`Effect template not loaded: ${effectId}`);
    }

    const instanceId = `fx-${this.nextInstanceId}`;
    this.nextInstanceId += 1;

    const instance = new EffectInstance(instanceId, template.clone(), x, y, {
      surfaceFactory: this.surfaceFactory,
      assetManager: this.assetManager,
      ...options,
    });
    this.instances.set(instanceId, instance);
    this.stats.instanceCount = this.instances.size;

    return instanceId;
  }

  /**
   * @param {string} instanceId
   * @returns {boolean}
   */
  stop(instanceId) {
    const instance = this.instances.get(instanceId);

    if (!instance) {
      return false;
    }

    instance.destroy();
    this.instances.delete(instanceId);
    this.refreshStats();
    return true;
  }

  /**
   * @param {number} deltaTime
   */
  update(deltaTime) {
    let particleCount = 0;

    for (const [instanceId, instance] of this.instances) {
      instance.update(deltaTime);

      if (!instance.isAlive()) {
        instance.destroy();
        this.instances.delete(instanceId);
        continue;
      }

      particleCount += instance.particles.length;
    }

    this.stats.instanceCount = this.instances.size;
    this.stats.particleCount = particleCount;
  }

  /**
   * @param {CanvasRenderingContext2D} [context]
   */
  render(context = this.context) {
    const { canvas } = context;
    let drawCount = 0;

    if (this.options.clearCanvas !== false) {
      context.fillStyle = this.options.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (this.instances.size === 0) {
      if (this.options.showIdleState !== false) {
        this.renderIdleState(context);
      }
      this.stats.drawCount = 0;
      return this.stats.drawCount;
    }

    for (const instance of this.instances.values()) {
      drawCount += instance.render(context);
    }

    this.stats.drawCount = drawCount;
    return this.stats.drawCount;
  }

  /**
   * @returns {{instanceCount: number, particleCount: number, drawCount: number}}
   */
  getStats() {
    return { ...this.stats };
  }

  refreshStats() {
    let particleCount = 0;

    for (const instance of this.instances.values()) {
      particleCount += instance.particles.length;
    }

    this.stats.instanceCount = this.instances.size;
    this.stats.particleCount = particleCount;

    if (this.instances.size === 0) {
      this.stats.drawCount = 0;
    }
  }

  destroy() {
    for (const instance of this.instances.values()) {
      instance.destroy();
    }

    this.instances.clear();
    this.templates.clear();
    this.templateSources.clear();
    this.stats.instanceCount = 0;
    this.stats.particleCount = 0;
    this.stats.drawCount = 0;
    this.assetManager.destroy();
  }

  /**
   * @param {string} id
   * @param {string|Object} asset
   */
  registerAsset(id, asset) {
    this.assetManager.registerAsset(id, asset);
  }

  /**
   * @param {string} url
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async loadTemplateFromUrl(url, options) {
    const cachedTemplateId = this.templateSources.get(url);

    if (cachedTemplateId) {
      return this.templates.get(cachedTemplateId);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load effect: ${url}`);
    }

    const templateData = await response.json();
    this.registerAssets(options.assets);
    const template = this.parseTemplate(templateData, { ...options, source: url });
    await this.preloadTemplateAssets(template);

    this.templates.set(template.id, template);
    this.templateSources.set(url, template.id);

    return template;
  }

  /**
   * @param {Object} template
   */
  async preloadTemplateAssets(template) {
    const spriteIds = collectTemplateSpriteIds(template);
    await Promise.all(spriteIds.map((spriteId) => this.assetManager.load(spriteId)));
  }

  /**
   * @param {Object<string, string|Object>|Array<{id: string, src: string}>|{assets: Array<{id: string, src: string}>}|undefined} assets
   */
  registerAssets(assets) {
    if (!assets) {
      return;
    }

    if (Array.isArray(assets.assets)) {
      this.registerAssets(assets.assets);
      return;
    }

    if (Array.isArray(assets)) {
      for (const asset of assets) {
        this.registerAsset(asset.id, asset);
      }
      return;
    }

    for (const [id, asset] of Object.entries(assets)) {
      this.registerAsset(id, asset);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} context
   */
  renderIdleState(context) {
    const { width, height } = context.canvas;

    context.save();
    context.fillStyle = '#f4cd69';
    context.font = '24px Georgia, serif';
    context.textAlign = 'center';
    context.fillText('NovaFX Runtime Ready', width / 2, height / 2);
    context.restore();
  }
}

/**
 * @param {Object} template
 * @returns {string[]}
 */
function collectTemplateSpriteIds(template) {
  const spriteIds = new Set();

  for (const emitter of template.emitters) {
    if (emitter.particle?.spriteId) {
      spriteIds.add(emitter.particle.spriteId);
    }
  }

  return [...spriteIds];
}