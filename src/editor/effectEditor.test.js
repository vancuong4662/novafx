import { describe, expect, it } from 'vitest';
import {
  addEmitter,
  addPhase,
  addTrack,
  duplicateEmitter,
  exportEmitter,
  importEmitter,
  moveEmitter,
  updateEmitterNestedField,
  updatePhaseField,
  validateEffectJson,
} from './effectEditor.js';

const baseEffect = {
  id: 'test',
  version: 1,
  duration: 1,
  surface: { width: 128, height: 128, blendMode: 'source-over' },
  emitters: [],
};

describe('effectEditor helpers', () => {
  it('adds editable emitters, tracks, and phases without mutating the source effect', () => {
    const withEmitter = addEmitter(baseEffect);
    const withTrack = addTrack(withEmitter, 'emitter-1');
    const withPhase = addPhase(withTrack, 'emitter-1', 0);
    const edited = updatePhaseField(withPhase, 'emitter-1', 0, 1, 'duration', '0.75');

    expect(baseEffect.emitters).toEqual([]);
    expect(edited.emitters[0].particle.tracks[0].phases).toHaveLength(2);
    expect(edited.emitters[0].particle.tracks[0].phases[1].duration).toBe(0.75);
  });

  it('validates edited effect JSON with the runtime parser', () => {
    const edited = addEmitter(baseEffect);

    expect(validateEffectJson(edited)).toBe(true);
  });

  it('parses random range object values entered into new numeric fields', () => {
    const withEmitter = addEmitter(baseEffect);
    const edited = updateEmitterNestedField(
      withEmitter,
      'emitter-1',
      'shape',
      'distanceOffset',
      '{"min":12,"max":36}',
    );

    expect(edited.emitters[0].shape.distanceOffset).toEqual({ min: 12, max: 36 });
  });

  it('duplicates an emitter with a unique id and cloned nested settings', () => {
    const withEmitter = addEmitter(baseEffect);
    const withTrack = addTrack(withEmitter, 'emitter-1');
    const duplicated = duplicateEmitter(withTrack, 'emitter-1');

    expect(duplicated.emitters).toHaveLength(2);
    expect(duplicated.emitters[1]).toEqual({
      ...duplicated.emitters[0],
      id: 'emitter-1-copy',
    });

    duplicated.emitters[1].particle.tracks[0].phases[0].duration = 2;
    expect(duplicated.emitters[0].particle.tracks[0].phases[0].duration).toBe(0.5);
    expect(withTrack.emitters).toHaveLength(1);
  });

  it('moves emitters to control their render depth without changing emitter data', () => {
    const withFirstEmitter = addEmitter(baseEffect);
    const withSecondEmitter = addEmitter(withFirstEmitter);
    const movedDown = moveEmitter(withSecondEmitter, 'emitter-1', 'down');
    const movedUp = moveEmitter(movedDown, 'emitter-1', 'up');

    expect(movedDown.emitters.map((emitter) => emitter.id)).toEqual(['emitter-2', 'emitter-1']);
    expect(movedDown.emitters[1]).toEqual(withSecondEmitter.emitters[0]);
    expect(movedUp.emitters.map((emitter) => emitter.id)).toEqual(['emitter-1', 'emitter-2']);
    expect(withSecondEmitter.emitters.map((emitter) => emitter.id)).toEqual(['emitter-1', 'emitter-2']);
  });

  it('exports and imports emitters as standalone JSON with a unique id', () => {
    const withEmitter = addEmitter(baseEffect);
    const withTrack = addTrack(withEmitter, 'emitter-1');
    const exportedEmitter = exportEmitter(withTrack, 'emitter-1');
    const imported = importEmitter(withTrack, exportedEmitter);

    expect(exportedEmitter).toEqual(withTrack.emitters[0]);
    expect(imported.emitters).toHaveLength(2);
    expect(imported.emitters[1]).toEqual({
      ...withTrack.emitters[0],
      id: 'emitter-1-2',
    });
    expect(withTrack.emitters).toHaveLength(1);
    expect(validateEffectJson(imported)).toBe(true);
  });

  it('imports wrapped emitter JSON from an emitter export container', () => {
    const withEmitter = addEmitter(baseEffect);
    const imported = importEmitter(baseEffect, { emitter: withEmitter.emitters[0] });

    expect(imported.emitters[0].id).toBe('emitter-1');
    expect(validateEffectJson(imported)).toBe(true);
  });
});