import { describe, expect, it } from 'vitest';
import { EffectTemplate } from './EffectTemplate.js';
import { parseEffectTemplate } from './parseEffectTemplate.js';

describe('parseEffectTemplate', () => {
  it('parses schema version 1 effect JSON into an EffectTemplate', () => {
    const template = parseEffectTemplate(
      {
        id: 'explosion',
        version: 1,
        duration: 1.2,
        surface: {
          width: 256,
          height: 256,
          blendMode: 'source-over',
        },
        emitters: [],
      },
      { source: 'effects/explosion.json' },
    );

    expect(template).toBeInstanceOf(EffectTemplate);
    expect(template.id).toBe('explosion');
    expect(template.name).toBe('explosion');
    expect(template.source).toBe('effects/explosion.json');
  });

  it('clones template data for effect instances', () => {
    const template = parseEffectTemplate({
      id: 'spark',
      name: 'Spark',
      version: 1,
      duration: 0.6,
      surface: {
        width: 128,
        height: 128,
        blendMode: 'lighter',
      },
      emitters: [{ id: 'burst' }],
    });

    const firstClone = template.clone();
    const secondClone = template.clone();

    expect(firstClone).not.toBe(secondClone);
    expect(firstClone.surface).not.toBe(secondClone.surface);
    expect(firstClone.emitters).not.toBe(secondClone.emitters);
    expect(firstClone.name).toBe('Spark');
  });

  it('accepts nova_point emitter shapes with angle offsets', () => {
    const template = parseEffectTemplate({
      id: 'nova-point-demo',
      version: 1,
      duration: 1,
      surface: {
        width: 128,
        height: 128,
        blendMode: 'source-over',
      },
      emitters: [
        {
          id: 'nova',
          shape: { type: 'nova_point', x: 0, y: 0, angleOffset: 1.5708 },
        },
      ],
    });

    expect(template.emitters[0].shape).toEqual({ type: 'nova_point', x: 0, y: 0, angleOffset: 1.5708 });
  });
});