import { EffectTemplate } from './EffectTemplate.js';

const REQUIRED_SURFACE_FIELDS = ['width', 'height', 'blendMode'];
const EMISSION_TYPES = new Set(['burst', 'continuous', 'interval']);
const SHAPE_TYPES = new Set(['point', 'nova_point', 'circle', 'line', 'box']);
const TRACK_PROPERTIES = new Set([
  'alpha',
  'size',
  'rotation',
  'speed',
  'direction',
  'gravity',
  'color',
]);
const TRACK_END_CONDITIONS = new Set(['duration', 'targetReached', 'lifetimePercentage', 'manual']);

/**
 * @param {Object} templateData
 * @param {Object} [options]
 * @returns {EffectTemplate}
 */
export function parseEffectTemplate(templateData, options = {}) {
  assertObject(templateData, 'Effect template must be an object.');
  assertString(templateData.id, 'Effect template requires string field: id.');
  assertNumber(templateData.version, 'Effect template requires number field: version.');
  assertNumber(templateData.duration, 'Effect template requires number field: duration.');
  assertObject(templateData.surface, 'Effect template requires object field: surface.');
  assertArray(templateData.emitters, 'Effect template requires array field: emitters.');

  for (const fieldName of REQUIRED_SURFACE_FIELDS) {
    if (!(fieldName in templateData.surface)) {
      throw new Error(`Effect surface requires field: ${fieldName}.`);
    }
  }

  assertNumber(templateData.surface.width, 'Effect surface requires number field: width.');
  assertNumber(templateData.surface.height, 'Effect surface requires number field: height.');
  assertString(templateData.surface.blendMode, 'Effect surface requires string field: blendMode.');

  const emitters = templateData.emitters.map((emitterData, index) =>
    normalizeEmitterData(emitterData, index),
  );

  return new EffectTemplate({
    id: templateData.id,
    version: templateData.version,
    name: templateData.name ?? templateData.id,
    duration: templateData.duration,
    surface: {
      width: templateData.surface.width,
      height: templateData.surface.height,
      blendMode: templateData.surface.blendMode,
    },
    emitters,
    source: options.source ?? null,
  });
}

/**
 * @param {Object} emitterData
 * @param {number} index
 * @returns {Object}
 */
function normalizeEmitterData(emitterData, index) {
  assertObject(emitterData, `Emitter at index ${index} must be an object.`);
  assertString(emitterData.id, `Emitter at index ${index} requires string field: id.`);

  const shape = normalizeEmitterShape(emitterData.shape ?? { type: 'point' }, emitterData.id);
  const emission = normalizeEmitterEmission(emitterData.emission ?? { type: 'burst' }, emitterData.id);

  return {
    id: emitterData.id,
    enabled: emitterData.enabled !== false,
    shape,
    emission,
    particle: normalizeParticleData(emitterData.particle ?? {}),
  };
}

/**
 * @param {Object} particleData
 * @returns {Object}
 */
function normalizeParticleData(particleData) {
  assertObject(particleData, 'Emitter particle config must be an object.');

  if (particleData.spriteId !== undefined) {
    assertString(particleData.spriteId, 'Emitter particle spriteId must be a string.');
  }

  if (particleData.blendMode !== undefined) {
    assertString(particleData.blendMode, 'Emitter particle blendMode must be a string.');
  }

  return {
    lifetime: particleData.lifetime ?? 1,
    size: particleData.size ?? 4,
    alpha: particleData.alpha ?? 1,
    color: particleData.color ?? '#f4cd69',
    speed: particleData.speed ?? 0,
    angle: particleData.angle ?? 0,
    gravity: particleData.gravity ?? 0,
    blendMode: particleData.blendMode ?? 'source-over',
    rotation: particleData.rotation ?? 0,
    scale: particleData.scale ?? 1,
    spriteId: particleData.spriteId ?? null,
    tracks: Array.isArray(particleData.tracks) ? particleData.tracks.map(normalizeTrackData) : [],
  };
}

/**
 * @param {Object} trackData
 * @returns {Object}
 */
function normalizeTrackData(trackData) {
  assertObject(trackData, 'Particle track config must be an object.');
  assertString(trackData.property, 'Particle track requires string field: property.');

  if (!TRACK_PROPERTIES.has(trackData.property)) {
    throw new Error(`Particle track has unsupported property: ${trackData.property}.`);
  }

  return {
    property: trackData.property,
    from: trackData.from,
    to: trackData.to,
    duration: trackData.duration ?? 1,
    randomChange: trackData.randomChange,
    endCondition: normalizeTrackEndCondition(trackData.endCondition),
    phases: Array.isArray(trackData.phases) ? trackData.phases.map(normalizeTrackPhaseData) : undefined,
  };
}

/**
 * @param {Object} phaseData
 * @returns {Object}
 */
function normalizeTrackPhaseData(phaseData) {
  assertObject(phaseData, 'Track phase config must be an object.');

  return {
    from: phaseData.from,
    to: phaseData.to,
    duration: phaseData.duration ?? 1,
    randomChange: phaseData.randomChange,
    endCondition: normalizeTrackEndCondition(phaseData.endCondition),
  };
}

/**
 * @param {Object|string|undefined} endCondition
 * @returns {Object}
 */
function normalizeTrackEndCondition(endCondition) {
  if (endCondition === undefined) {
    return { type: 'duration' };
  }

  if (typeof endCondition === 'string') {
    if (!TRACK_END_CONDITIONS.has(endCondition)) {
      throw new Error(`Track has unsupported end condition: ${endCondition}.`);
    }

    return { type: endCondition };
  }

  assertObject(endCondition, 'Track end condition must be an object or string.');
  assertString(endCondition.type, 'Track end condition requires string field: type.');

  if (!TRACK_END_CONDITIONS.has(endCondition.type)) {
    throw new Error(`Track has unsupported end condition: ${endCondition.type}.`);
  }

  return {
    type: endCondition.type,
    value: endCondition.value,
  };
}

/**
 * @param {Object} shapeData
 * @param {string} emitterId
 * @returns {Object}
 */
function normalizeEmitterShape(shapeData, emitterId) {
  assertObject(shapeData, `Emitter ${emitterId} shape must be an object.`);
  assertString(shapeData.type, `Emitter ${emitterId} shape requires string field: type.`);

  if (!SHAPE_TYPES.has(shapeData.type)) {
    throw new Error(`Emitter ${emitterId} has unsupported shape type: ${shapeData.type}.`);
  }

  return { ...shapeData };
}

/**
 * @param {Object} emissionData
 * @param {string} emitterId
 * @returns {Object}
 */
function normalizeEmitterEmission(emissionData, emitterId) {
  assertObject(emissionData, `Emitter ${emitterId} emission must be an object.`);
  assertString(emissionData.type, `Emitter ${emitterId} emission requires string field: type.`);

  if (!EMISSION_TYPES.has(emissionData.type)) {
    throw new Error(`Emitter ${emitterId} has unsupported emission type: ${emissionData.type}.`);
  }

  return {
    type: emissionData.type,
    count: emissionData.count ?? 1,
    rate: emissionData.rate ?? 10,
    interval: emissionData.interval ?? 0.1,
    startTime: emissionData.startTime ?? 0,
    loop: emissionData.loop === true,
  };
}

/**
 * @param {unknown} value
 * @param {string} message
 */
function assertObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * @param {unknown} value
 * @param {string} message
 */
function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * @param {unknown} value
 * @param {string} message
 */
function assertString(value, message) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(message);
  }
}

/**
 * @param {unknown} value
 * @param {string} message
 */
function assertNumber(value, message) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }
}