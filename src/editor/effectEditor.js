import { parseEffectTemplate } from '../runtime/core/parseEffectTemplate.js';
import { BUILT_IN_PARTICLE_SHAPES } from '../runtime/asset/builtInParticleShapes.js';

export const TRACK_PROPERTIES = ['alpha', 'size', 'rotation', 'speed', 'direction', 'gravity', 'color'];
export const END_CONDITION_TYPES = ['duration', 'targetReached', 'lifetimePercentage', 'manual'];
export const EMISSION_TYPES = ['burst', 'continuous', 'interval'];
export const SHAPE_TYPES = ['point', 'nova_point', 'circle', 'line', 'box'];
export const SPRITE_IDS = BUILT_IN_PARTICLE_SHAPES.map((shape) => shape.id);

export function cloneEffect(effectJson) {
  return JSON.parse(JSON.stringify(effectJson));
}

export function parseEditorValue(value, currentValue) {
  if (typeof currentValue === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  if (currentValue === undefined && value !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  if (typeof currentValue === 'boolean') {
    return Boolean(value);
  }

  if (isRangeValue(currentValue)) {
    try {
      const parsed = JSON.parse(value);
      return isRangeValue(parsed) ? parsed : currentValue;
    } catch {
      return currentValue;
    }
  }

  return value;
}

export function formatEditorValue(value) {
  if (isRangeValue(value)) {
    return JSON.stringify(value);
  }

  return value ?? '';
}

export function updateEffectField(effectJson, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  nextEffect[fieldName] = parseEditorValue(value, nextEffect[fieldName]);
  return nextEffect;
}

export function updateSurfaceField(effectJson, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  nextEffect.surface[fieldName] = parseEditorValue(value, nextEffect.surface[fieldName]);
  return nextEffect;
}

export function addEmitter(effectJson) {
  const nextEffect = cloneEffect(effectJson);
  const nextIndex = nextEffect.emitters.length + 1;
  nextEffect.emitters.push({
    id: `emitter-${nextIndex}`,
    enabled: true,
    shape: { type: 'point', x: 0, y: 0 },
    emission: { type: 'burst', count: 8, startTime: 0, loop: false },
    particle: {
      lifetime: 0.6,
      size: 8,
      speed: 28,
      angle: 0,
      gravity: 0,
      alpha: 1,
      color: '#f4cd69',
      blendMode: 'source-over',
      spriteId: 'circle',
      tracks: [],
    },
  });
  return nextEffect;
}

export function duplicateEmitter(effectJson, emitterId) {
  const nextEffect = cloneEffect(effectJson);
  const sourceEmitter = findEmitter(nextEffect, emitterId);
  const duplicatedEmitter = JSON.parse(JSON.stringify(sourceEmitter));

  duplicatedEmitter.id = createUniqueEmitterId(nextEffect, `${sourceEmitter.id}-copy`);
  nextEffect.emitters.push(duplicatedEmitter);
  return nextEffect;
}

export function moveEmitter(effectJson, emitterId, direction) {
  const nextEffect = cloneEffect(effectJson);
  const emitterIndex = nextEffect.emitters.findIndex((emitter) => emitter.id === emitterId);

  if (emitterIndex === -1) {
    return nextEffect;
  }

  const targetIndex = direction === 'up' ? emitterIndex - 1 : emitterIndex + 1;

  if (targetIndex < 0 || targetIndex >= nextEffect.emitters.length) {
    return nextEffect;
  }

  const [emitter] = nextEffect.emitters.splice(emitterIndex, 1);
  nextEffect.emitters.splice(targetIndex, 0, emitter);
  return nextEffect;
}

export function exportEmitter(effectJson, emitterId) {
  const emitter = findEmitter(effectJson, emitterId);

  if (!emitter) {
    throw new Error(`Emitter not found: ${emitterId}`);
  }

  return JSON.parse(JSON.stringify(emitter));
}

export function importEmitter(effectJson, emitterData) {
  const sourceEmitter = normalizeImportedEmitter(emitterData);
  const nextEffect = cloneEffect(effectJson);
  const importedEmitter = JSON.parse(JSON.stringify(sourceEmitter));

  importedEmitter.id = createUniqueEmitterId(nextEffect, importedEmitter.id);
  nextEffect.emitters.push(importedEmitter);
  validateEffectJson(nextEffect);
  return nextEffect;
}

export function removeEmitter(effectJson, emitterId) {
  const nextEffect = cloneEffect(effectJson);
  nextEffect.emitters = nextEffect.emitters.filter((emitter) => emitter.id !== emitterId);
  return nextEffect;
}

export function updateEmitterField(effectJson, emitterId, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const emitter = findEmitter(nextEffect, emitterId);
  emitter[fieldName] = parseEditorValue(value, emitter[fieldName]);
  return nextEffect;
}

export function updateEmitterNestedField(effectJson, emitterId, groupName, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const emitter = findEmitter(nextEffect, emitterId);
  emitter[groupName][fieldName] = parseEditorValue(value, emitter[groupName][fieldName]);
  return nextEffect;
}

export function updateParticleField(effectJson, emitterId, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const emitter = findEmitter(nextEffect, emitterId);
  emitter.particle[fieldName] = parseEditorValue(value, emitter.particle[fieldName]);
  return nextEffect;
}

export function addTrack(effectJson, emitterId) {
  const nextEffect = cloneEffect(effectJson);
  const emitter = findEmitter(nextEffect, emitterId);
  emitter.particle.tracks = emitter.particle.tracks ?? [];
  emitter.particle.tracks.push({
    property: 'alpha',
    phases: [createDefaultPhase('alpha')],
  });
  return nextEffect;
}

export function removeTrack(effectJson, emitterId, trackIndex) {
  const nextEffect = cloneEffect(effectJson);
  const emitter = findEmitter(nextEffect, emitterId);
  emitter.particle.tracks.splice(trackIndex, 1);
  return nextEffect;
}

export function updateTrackField(effectJson, emitterId, trackIndex, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const track = findTrack(nextEffect, emitterId, trackIndex);
  track[fieldName] = parseEditorValue(value, track[fieldName]);
  return nextEffect;
}

export function addPhase(effectJson, emitterId, trackIndex) {
  const nextEffect = cloneEffect(effectJson);
  const track = findTrack(nextEffect, emitterId, trackIndex);
  track.phases = track.phases ?? [createDefaultPhase(track.property)];
  track.phases.push(createDefaultPhase(track.property));
  return nextEffect;
}

export function removePhase(effectJson, emitterId, trackIndex, phaseIndex) {
  const nextEffect = cloneEffect(effectJson);
  const track = findTrack(nextEffect, emitterId, trackIndex);
  track.phases.splice(phaseIndex, 1);
  return nextEffect;
}

export function updatePhaseField(effectJson, emitterId, trackIndex, phaseIndex, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const track = findTrack(nextEffect, emitterId, trackIndex);
  const phase = track.phases[phaseIndex];
  phase[fieldName] = parseEditorValue(value, phase[fieldName]);
  return nextEffect;
}

export function updatePhaseEndCondition(effectJson, emitterId, trackIndex, phaseIndex, fieldName, value) {
  const nextEffect = cloneEffect(effectJson);
  const track = findTrack(nextEffect, emitterId, trackIndex);
  const phase = track.phases[phaseIndex];
  phase.endCondition = phase.endCondition ?? { type: 'duration' };
  phase.endCondition[fieldName] = parseEditorValue(value, phase.endCondition[fieldName]);
  return nextEffect;
}

export function validateEffectJson(effectJson) {
  parseEffectTemplate(effectJson);
  return true;
}

function createDefaultPhase(property) {
  return {
    from: property === 'color' ? '#ffffff' : 1,
    to: property === 'color' ? '#f4cd69' : 0,
    duration: 0.5,
    endCondition: { type: 'duration' },
  };
}

function findEmitter(effectJson, emitterId) {
  return effectJson.emitters.find((emitter) => emitter.id === emitterId);
}

function normalizeImportedEmitter(emitterData) {
  const importedEmitter = emitterData?.emitter ?? emitterData;

  if (!importedEmitter || typeof importedEmitter !== 'object' || Array.isArray(importedEmitter)) {
    throw new Error('Imported emitter JSON must be an emitter object.');
  }

  return importedEmitter;
}

function createUniqueEmitterId(effectJson, baseId) {
  const existingIds = new Set(effectJson.emitters.map((emitter) => emitter.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let index = 2;
  let nextId = `${baseId}-${index}`;

  while (existingIds.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

function findTrack(effectJson, emitterId, trackIndex) {
  const emitter = findEmitter(effectJson, emitterId);
  return emitter.particle.tracks[trackIndex];
}

function isRangeValue(value) {
  return Boolean(value && typeof value === 'object' && 'min' in value && 'max' in value);
}