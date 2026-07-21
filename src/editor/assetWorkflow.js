export function normalizeAssetId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createUniqueAssetId(fileName, existingIds = []) {
  const baseId = normalizeAssetId(fileName) || 'custom-asset';
  const existing = new Set(existingIds);

  if (!existing.has(baseId)) {
    return baseId;
  }

  let index = 2;
  let nextId = `${baseId}-${index}`;

  while (existing.has(nextId)) {
    index += 1;
    nextId = `${baseId}-${index}`;
  }

  return nextId;
}

export function renameParticleSpriteId(effectJson, previousId, nextId) {
  const nextEffect = JSON.parse(JSON.stringify(effectJson));

  for (const emitter of nextEffect.emitters ?? []) {
    if (emitter.particle?.spriteId === previousId) {
      emitter.particle.spriteId = nextId;
    }
  }

  return nextEffect;
}

export function createAssetManifest(customAssets) {
  return {
    version: 1,
    assets: customAssets.map((asset) => ({
      id: asset.id,
      src: `assets/${asset.fileName ?? asset.name}`,
      fileName: asset.fileName ?? asset.name,
    })),
  };
}