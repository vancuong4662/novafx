import { describe, expect, it } from 'vitest';
import {
  createAssetManifest,
  createUniqueAssetId,
  normalizeAssetId,
  renameParticleSpriteId,
} from './assetWorkflow.js';

describe('asset workflow helpers', () => {
  it('normalizes custom image names into stable asset ids', () => {
    expect(normalizeAssetId('Magic Rune.PNG')).toBe('magic-rune');
    expect(createUniqueAssetId('Magic Rune.PNG', ['magic-rune'])).toBe('magic-rune-2');
  });

  it('renames matching particle sprite ids without mutating the source effect', () => {
    const effect = {
      id: 'test',
      emitters: [
        { id: 'a', particle: { spriteId: 'custom-rune' } },
        { id: 'b', particle: { spriteId: 'circle' } },
      ],
    };

    const renamed = renameParticleSpriteId(effect, 'custom-rune', 'custom-spark');

    expect(renamed.emitters[0].particle.spriteId).toBe('custom-spark');
    expect(renamed.emitters[1].particle.spriteId).toBe('circle');
    expect(effect.emitters[0].particle.spriteId).toBe('custom-rune');
  });

  it('exports custom assets as external manifest references', () => {
    const manifest = createAssetManifest([
      { id: 'custom-rune', fileName: 'rune.png', url: 'blob:local-preview' },
    ]);

    expect(manifest).toEqual({
      version: 1,
      assets: [{ id: 'custom-rune', src: 'assets/rune.png', fileName: 'rune.png' }],
    });
  });
});