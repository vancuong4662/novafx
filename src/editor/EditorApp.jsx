import { useEffect, useRef, useState } from 'react';
import { BUILT_IN_PARTICLE_SHAPES } from '../runtime/asset/builtInParticleShapes.js';
import { NovaFX } from '../runtime/index.js';
import {
  EMISSION_TYPES,
  END_CONDITION_TYPES,
  SHAPE_TYPES,
  SPRITE_IDS,
  TRACK_PROPERTIES,
  addEmitter,
  addPhase,
  addTrack,
  duplicateEmitter,
  exportEmitter,
  formatEditorValue,
  importEmitter,
  moveEmitter,
  removeEmitter,
  removePhase,
  removeTrack,
  updateEffectField,
  updateEmitterField,
  updateEmitterNestedField,
  updateParticleField,
  updatePhaseEndCondition,
  updatePhaseField,
  updateSurfaceField,
  updateTrackField,
  validateEffectJson,
} from './effectEditor.js';
import {
  createAssetManifest,
  createUniqueAssetId,
  normalizeAssetId,
  renameParticleSpriteId,
} from './assetWorkflow.js';
import { drawCoverImage, downloadJson } from './previewCanvas.js';
import { DEFAULT_BACKGROUND_URL, PRESET_EFFECTS, useEditorStore } from './editorState.js';

export function EditorApp() {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const backgroundRef = useRef(null);
  const backgroundObjectUrlRef = useRef(null);
  const customAssetUrlsRef = useRef(new Set());
  const frameRef = useRef(0);
  const previousTimeRef = useRef(performance.now());
  const activeInstanceRef = useRef(null);
  const [jsonText, setJsonText] = useState('');
  const [assetDraftIds, setAssetDraftIds] = useState({});

  const effectJson = useEditorStore((state) => state.effectJson);
  const sourceName = useEditorStore((state) => state.sourceName);
  const selectedEmitterId = useEditorStore((state) => state.selectedEmitterId);
  const backgroundUrl = useEditorStore((state) => state.backgroundUrl);
  const backgroundName = useEditorStore((state) => state.backgroundName);
  const customAssets = useEditorStore((state) => state.customAssets);
  const stats = useEditorStore((state) => state.stats);
  const status = useEditorStore((state) => state.status);
  const setEffectJson = useEditorStore((state) => state.setEffectJson);
  const selectEmitter = useEditorStore((state) => state.selectEmitter);
  const setBackground = useEditorStore((state) => state.setBackground);
  const addCustomAsset = useEditorStore((state) => state.addCustomAsset);
  const renameCustomAsset = useEditorStore((state) => state.renameCustomAsset);
  const setStats = useEditorStore((state) => state.setStats);
  const setStatus = useEditorStore((state) => state.setStatus);

  useEffect(() => {
    const canvas = canvasRef.current;
    const runtime = new NovaFX(canvas, {
      clearCanvas: false,
      showIdleState: false,
      backgroundColor: 'transparent',
    });

    runtimeRef.current = runtime;
    loadPreset(PRESET_EFFECTS[0]);

    return () => {
      cancelAnimationFrame(frameRef.current);
      runtime.destroy();

      if (backgroundObjectUrlRef.current) {
        URL.revokeObjectURL(backgroundObjectUrlRef.current);
      }

      for (const objectUrl of customAssetUrlsRef.current) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!effectJson) {
      return;
    }

    setJsonText(JSON.stringify(effectJson, null, 2));
    loadEffectIntoPreview(effectJson);
  }, [effectJson]);

  useEffect(() => {
    const image = new Image();

    image.onload = () => {
      backgroundRef.current = image;
    };
    image.src = backgroundUrl;
  }, [backgroundUrl]);

  useEffect(() => {
    const frame = (currentTime) => {
      const canvas = canvasRef.current;
      const runtime = runtimeRef.current;
      const context = canvas.getContext('2d');
      const deltaTime = (currentTime - previousTimeRef.current) / 1000;
      previousTimeRef.current = currentTime;

      drawPreviewBackground(context, canvas);
      runtime.update(deltaTime);
      runtime.render(context);
      setStats(runtime.getStats());

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, [setStats]);

  async function loadPreset(preset) {
    try {
      setStatus(`Loading ${preset.label}...`);
      const response = await fetch(preset.url);
      const data = await response.json();
      setEffectJson(data, preset.label);
    } catch (error) {
      setStatus(`Failed to load ${preset.label}: ${error.message}`);
    }
  }

  async function loadEffectIntoPreview(nextEffectJson) {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    if (activeInstanceRef.current) {
      runtime.stop(activeInstanceRef.current);
    }

    try {
      registerCustomAssetsInRuntime();
      await runtime.load(nextEffectJson);
      activeInstanceRef.current = runtime.play(
        nextEffectJson.id,
        canvasRef.current.width / 2,
        canvasRef.current.height / 2,
      );
      setStatus(`Previewing ${nextEffectJson.id}`);
    } catch (error) {
      activeInstanceRef.current = null;
      setStatus(`Preview failed: ${error.message}`);
    }
  }

  function registerCustomAssetsInRuntime() {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    for (const asset of customAssets) {
      runtime.registerAsset(asset.id, asset.url);
    }
  }

  function drawPreviewBackground(context, canvas) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundRef.current) {
      drawCoverImage(context, backgroundRef.current, canvas.width, canvas.height);
      return;
    }

    context.fillStyle = '#141916';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function handleApplyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setEffectJson(parsed, `${parsed.id ?? 'custom'}.json`);
    } catch (error) {
      setStatus(`Invalid JSON: ${error.message}`);
    }
  }

  function handleImportJson(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setEffectJson(parsed, file.name);
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function handleExportJson() {
    if (!effectJson) {
      return;
    }

    try {
      validateEffectJson(effectJson);
      downloadJson(effectJson, `${effectJson.id || 'novafx-effect'}.json`);
      setStatus(`Exported ${effectJson.id}`);
    } catch (error) {
      setStatus(`Export blocked: ${error.message}`);
    }
  }

  function handleExportAssetManifest() {
    if (customAssets.length === 0) {
      setStatus('No custom assets to export.');
      return;
    }

    const manifest = createAssetManifest(customAssets);
    downloadJson(manifest, `${effectJson?.id || 'novafx'}-assets.json`);
    setStatus(`Exported ${customAssets.length} custom asset reference(s).`);
  }

  function commitEffect(nextEffectJson, nextSourceName = sourceName) {
    setEffectJson(nextEffectJson, nextSourceName);
  }

  function handleDuplicateEmitter() {
    if (!effectJson || !selectedEmitter) {
      return;
    }

    const nextEffect = duplicateEmitter(effectJson, selectedEmitter.id);
    const duplicatedEmitter = nextEffect.emitters[nextEffect.emitters.length - 1];

    commitEffect(nextEffect);
    selectEmitter(duplicatedEmitter.id);
    setStatus(`Duplicated ${selectedEmitter.id} as ${duplicatedEmitter.id}.`);
  }

  function handleMoveEmitter(direction) {
    if (!effectJson || !selectedEmitter) {
      return;
    }

    const nextEffect = moveEmitter(effectJson, selectedEmitter.id, direction);
    const currentIndex = effectJson.emitters.findIndex((emitter) => emitter.id === selectedEmitter.id);
    const nextIndex = nextEffect.emitters.findIndex((emitter) => emitter.id === selectedEmitter.id);

    commitEffect(nextEffect);
    selectEmitter(selectedEmitter.id);

    if (currentIndex !== nextIndex) {
      setStatus(`Moved ${selectedEmitter.id} ${direction}.`);
    }
  }

  function handleExportEmitter() {
    if (!effectJson || !selectedEmitter) {
      return;
    }

    try {
      const emitterJson = exportEmitter(effectJson, selectedEmitter.id);
      downloadJson(emitterJson, `${selectedEmitter.id || 'novafx-emitter'}.emitter.json`);
      setStatus(`Exported emitter ${selectedEmitter.id}.`);
    } catch (error) {
      setStatus(`Emitter export failed: ${error.message}`);
    }
  }

  function handleImportEmitter(event) {
    const file = event.target.files?.[0];

    if (!file || !effectJson) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const nextEffect = importEmitter(effectJson, parsed);
        const importedEmitter = nextEffect.emitters[nextEffect.emitters.length - 1];

        commitEffect(nextEffect);
        selectEmitter(importedEmitter.id);
        setStatus(`Imported emitter ${importedEmitter.id}.`);
      } catch (error) {
        setStatus(`Emitter import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (backgroundObjectUrlRef.current) {
      URL.revokeObjectURL(backgroundObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    backgroundObjectUrlRef.current = objectUrl;
    setBackground(objectUrl, file.name);
    event.target.value = '';
  }

  function handleCustomAssetUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type && file.type !== 'image/png') {
      setStatus('Custom particle shapes must be PNG files.');
      event.target.value = '';
      return;
    }

    const existingIds = [...SPRITE_IDS, ...customAssets.map((asset) => asset.id)];
    const id = createUniqueAssetId(file.name, existingIds);
    const objectUrl = URL.createObjectURL(file);
    const asset = {
      id,
      name: file.name,
      fileName: file.name,
      url: objectUrl,
      type: 'custom',
    };

    customAssetUrlsRef.current.add(objectUrl);
    addCustomAsset(asset);
    runtimeRef.current?.registerAsset(id, objectUrl);
    setAssetDraftIds((current) => ({ ...current, [id]: id }));

    if (effectJson && selectedEmitter) {
      commitEffect(updateParticleField(effectJson, selectedEmitter.id, 'spriteId', id));
      setStatus(`Uploaded and assigned ${id}.`);
    } else {
      setStatus(`Uploaded ${id}.`);
    }

    event.target.value = '';
  }

  function selectParticleAsset(assetId) {
    if (!effectJson || !selectedEmitter) {
      setStatus('Select an emitter before assigning an asset.');
      return;
    }

    commitEffect(updateParticleField(effectJson, selectedEmitter.id, 'spriteId', assetId));
    setStatus(`Assigned ${assetId} to ${selectedEmitter.id}.`);
  }

  function updateAssetDraft(assetId, value) {
    setAssetDraftIds((current) => ({ ...current, [assetId]: value }));
  }

  function commitAssetRename(asset) {
    const draftValue = assetDraftIds[asset.id] ?? asset.id;
    const nextId = normalizeAssetId(draftValue);
    const existingIds = [...SPRITE_IDS, ...customAssets.map((item) => item.id).filter((id) => id !== asset.id)];

    if (!nextId) {
      updateAssetDraft(asset.id, asset.id);
      setStatus('Asset id cannot be empty.');
      return;
    }

    if (existingIds.includes(nextId)) {
      updateAssetDraft(asset.id, asset.id);
      setStatus(`Asset id already exists: ${nextId}`);
      return;
    }

    if (nextId === asset.id) {
      return;
    }

    renameCustomAsset(asset.id, nextId);
    runtimeRef.current?.registerAsset(nextId, asset.url);
    setAssetDraftIds((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[asset.id];
      nextDrafts[nextId] = nextId;
      return nextDrafts;
    });

    if (effectJson) {
      commitEffect(renameParticleSpriteId(effectJson, asset.id, nextId));
    }

    setStatus(`Renamed asset ${asset.id} to ${nextId}.`);
  }

  function resetBackground() {
    if (backgroundObjectUrlRef.current) {
      URL.revokeObjectURL(backgroundObjectUrlRef.current);
      backgroundObjectUrlRef.current = null;
    }

    setBackground(DEFAULT_BACKGROUND_URL, 'forest.png');
  }

  const selectedEmitter = effectJson?.emitters?.find((emitter) => emitter.id === selectedEmitterId);
  const selectedEmitterIndex = effectJson?.emitters?.findIndex((emitter) => emitter.id === selectedEmitterId) ?? -1;
  const spriteOptions = [...SPRITE_IDS, ...customAssets.map((asset) => asset.id)];
  const selectedSpriteId = selectedEmitter?.particle?.spriteId ?? null;

  return (
    <main className="editor-shell">
      <aside className="editor-sidebar">
        <p className="eyebrow">NovaFX Editor</p>
        <h1><Icon name="stars" />Effect Workspace</h1>
        <section className="editor-section">
          <h2><Icon name="collection-play" />Presets</h2>
          <div className="preset-list">
            {PRESET_EFFECTS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => loadPreset(preset)}>
                <Icon name={presetIconFor(preset.id)} />
                {preset.label}
              </button>
            ))}
          </div>
        </section>
        <section className="editor-section">
          <h2><Icon name="images" />Asset Panel</h2>
          <AssetPanel
            builtInAssets={BUILT_IN_PARTICLE_SHAPES}
            customAssets={customAssets}
            selectedAssetId={selectedSpriteId}
            assetDraftIds={assetDraftIds}
            backgroundName={backgroundName}
            onAssetSelect={selectParticleAsset}
            onAssetDraftChange={updateAssetDraft}
            onAssetRename={commitAssetRename}
            onCustomUpload={handleCustomAssetUpload}
            onManifestExport={handleExportAssetManifest}
          />
          <label className="file-action">
            <Icon name="image" />
            Upload Background
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
          </label>
          <button type="button" onClick={resetBackground}><Icon name="tree" />Use Forest</button>
        </section>
      </aside>

      <section className="preview-panel">
        <div className="preview-header">
          <div>
            <p className="eyebrow">Preview</p>
            <h2><Icon name="play-circle" />{sourceName}</h2>
          </div>
          <div className="preview-actions">
            <label className="file-action">
              <Icon name="file-earmark-arrow-up" />
              Import JSON
              <input type="file" accept="application/json,.json" onChange={handleImportJson} />
            </label>
            <button type="button" onClick={handleExportJson}><Icon name="download" />Export JSON</button>
            <button type="button" onClick={() => effectJson && loadEffectIntoPreview(effectJson)}><Icon name="arrow-clockwise" />Replay</button>
          </div>
        </div>
        <canvas ref={canvasRef} width="960" height="540" aria-label="NovaFX editor preview canvas" />
        <p className="stats-line">
          {status} | instances {stats.instanceCount} / particles {stats.particleCount} / draws {stats.drawCount}
        </p>
      </section>

      <aside className="inspector-panel">
        <section className="editor-section">
          <h2><Icon name="sliders" />Inspector</h2>
          <EffectControls effectJson={effectJson} onChange={(field, value) => commitEffect(updateEffectField(effectJson, field, value))} />
          <SurfaceControls effectJson={effectJson} onChange={(field, value) => commitEffect(updateSurfaceField(effectJson, field, value))} />
        </section>
        <section className="editor-section">
          <div className="section-heading-row">
            <h2><Icon name="broadcast-pin" />Emitter</h2>
            <button type="button" onClick={() => commitEffect(addEmitter(effectJson))}><Icon name="plus-lg" />Add</button>
          </div>
          <div className="emitter-tabs">
            {effectJson?.emitters?.map((emitter) => (
              <button
                key={emitter.id}
                type="button"
                className={emitter.id === selectedEmitterId ? 'is-active' : ''}
                onClick={() => selectEmitter(emitter.id)}
              >
                {emitter.id}
              </button>
            ))}
          </div>
          <EmitterControls
            effectJson={effectJson}
            emitter={selectedEmitter}
            onRemove={() => {
              const nextEffect = removeEmitter(effectJson, selectedEmitter.id);
              commitEffect(nextEffect);
            }}
            onDuplicate={handleDuplicateEmitter}
            onMove={handleMoveEmitter}
            onExport={handleExportEmitter}
            onImport={handleImportEmitter}
            onEmitterChange={(field, value) => commitEffect(updateEmitterField(effectJson, selectedEmitter.id, field, value))}
            onShapeChange={(field, value) => commitEffect(updateEmitterNestedField(effectJson, selectedEmitter.id, 'shape', field, value))}
            onEmissionChange={(field, value) => commitEffect(updateEmitterNestedField(effectJson, selectedEmitter.id, 'emission', field, value))}
            onParticleChange={(field, value) => commitEffect(updateParticleField(effectJson, selectedEmitter.id, field, value))}
            canMoveUp={selectedEmitterIndex > 0}
            canMoveDown={selectedEmitterIndex >= 0 && selectedEmitterIndex < effectJson.emitters.length - 1}
            spriteOptions={spriteOptions}
          />
        </section>
        <section className="editor-section">
          <div className="section-heading-row">
            <h2><Icon name="diagram-3" />Track Editor</h2>
            <button type="button" disabled={!selectedEmitter} onClick={() => commitEffect(addTrack(effectJson, selectedEmitter.id))}><Icon name="plus-lg" />Add Track</button>
          </div>
          <TrackEditor
            effectJson={effectJson}
            emitter={selectedEmitter}
            onTrackChange={(trackIndex, field, value) => commitEffect(updateTrackField(effectJson, selectedEmitter.id, trackIndex, field, value))}
            onTrackRemove={(trackIndex) => commitEffect(removeTrack(effectJson, selectedEmitter.id, trackIndex))}
            onPhaseAdd={(trackIndex) => commitEffect(addPhase(effectJson, selectedEmitter.id, trackIndex))}
            onPhaseRemove={(trackIndex, phaseIndex) => commitEffect(removePhase(effectJson, selectedEmitter.id, trackIndex, phaseIndex))}
            onPhaseChange={(trackIndex, phaseIndex, field, value) => commitEffect(updatePhaseField(effectJson, selectedEmitter.id, trackIndex, phaseIndex, field, value))}
            onEndConditionChange={(trackIndex, phaseIndex, field, value) => commitEffect(updatePhaseEndCondition(effectJson, selectedEmitter.id, trackIndex, phaseIndex, field, value))}
          />
        </section>
        <section className="editor-section json-editor-section">
          <h2><Icon name="braces" />Effect JSON</h2>
          <textarea value={jsonText} spellCheck="false" onChange={(event) => setJsonText(event.target.value)} />
          <button type="button" onClick={handleApplyJson}><Icon name="check2-circle" />Apply JSON</button>
        </section>
      </aside>
    </main>
  );
}

function AssetPanel({
  builtInAssets,
  customAssets,
  selectedAssetId,
  assetDraftIds,
  backgroundName,
  onAssetSelect,
  onAssetDraftChange,
  onAssetRename,
  onCustomUpload,
  onManifestExport,
}) {
  return (
    <div className="asset-panel-stack">
      <p><Icon name="card-image" />Background: {backgroundName}</p>
      <h3><Icon name="grid-3x3-gap" />Built-in Shapes</h3>
      <div className="asset-grid">
        {builtInAssets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={asset.id === selectedAssetId ? 'asset-tile is-active' : 'asset-tile'}
            onClick={() => onAssetSelect(asset.id)}
          >
            <img src={asset.src} alt="" />
            <span>{asset.id}</span>
          </button>
        ))}
      </div>
      <div className="section-heading-row asset-heading">
        <h3><Icon name="filetype-png" />Custom PNG</h3>
        <label className="file-action compact-action">
          <Icon name="upload" />
          Upload
          <input type="file" accept="image/png,.png" onChange={onCustomUpload} />
        </label>
      </div>
      {customAssets.length === 0 ? (
        <p>No custom shape uploaded.</p>
      ) : (
        <div className="custom-asset-list">
          {customAssets.map((asset) => (
            <article className={asset.id === selectedAssetId ? 'custom-asset is-active' : 'custom-asset'} key={asset.id}>
              <button type="button" className="asset-preview-button" onClick={() => onAssetSelect(asset.id)}>
                <img src={asset.url} alt="" />
              </button>
              <label className="field-control">
                <span>Asset ID</span>
                <input
                  value={assetDraftIds[asset.id] ?? asset.id}
                  onChange={(event) => onAssetDraftChange(asset.id, event.target.value)}
                  onBlur={() => onAssetRename(asset)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={onManifestExport}><Icon name="box-arrow-up" />Export Asset Manifest</button>
    </div>
  );
}

function EffectControls({ effectJson, onChange }) {
  if (!effectJson) {
    return <p>No effect loaded.</p>;
  }

  return (
    <div className="control-grid">
      <TextControl label="Effect ID" value={effectJson.id} onChange={(value) => onChange('id', value)} />
      <TextControl label="Name" value={effectJson.name ?? ''} onChange={(value) => onChange('name', value)} />
      <TextControl label="Duration" value={effectJson.duration} onChange={(value) => onChange('duration', value)} />
    </div>
  );
}

function SurfaceControls({ effectJson, onChange }) {
  if (!effectJson) {
    return null;
  }

  return (
    <div className="control-grid compact-controls">
      <TextControl label="Surface W" value={effectJson.surface.width} onChange={(value) => onChange('width', value)} />
      <TextControl label="Surface H" value={effectJson.surface.height} onChange={(value) => onChange('height', value)} />
      <SelectControl
        label="Surface Blend"
        value={effectJson.surface.blendMode}
        options={['source-over', 'lighter', 'screen', 'multiply']}
        onChange={(value) => onChange('blendMode', value)}
      />
    </div>
  );
}

function EmitterControls({
  emitter,
  onRemove,
  onDuplicate,
  onMove,
  onExport,
  onImport,
  onEmitterChange,
  onShapeChange,
  onEmissionChange,
  onParticleChange,
  canMoveUp,
  canMoveDown,
  spriteOptions,
}) {
  if (!emitter) {
    return <p>No emitter selected.</p>;
  }

  return (
    <div className="control-stack">
      <div className="section-heading-row inline-row">
        <TextControl label="Emitter ID" value={emitter.id} onChange={(value) => onEmitterChange('id', value)} />
        <div className="button-row">
          <button type="button" disabled={!canMoveUp} onClick={() => onMove('up')}><Icon name="arrow-up" />Up</button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMove('down')}><Icon name="arrow-down" />Down</button>
          <button type="button" onClick={onDuplicate}><Icon name="copy" />Duplicate</button>
          <button type="button" onClick={onExport}><Icon name="download" />Export</button>
          <label className="file-action">
            <Icon name="upload" />
            Import
            <input type="file" accept="application/json,.json" onChange={onImport} />
          </label>
          <button type="button" onClick={onRemove}><Icon name="trash3" />Remove</button>
        </div>
      </div>
      <label className="toggle-control">
        <input type="checkbox" checked={emitter.enabled !== false} onChange={(event) => onEmitterChange('enabled', event.target.checked)} />
        Enabled
      </label>

      <h3><Icon name="bounding-box" />Shape</h3>
      <div className="control-grid compact-controls">
        <SelectControl label="Type" value={emitter.shape.type} options={SHAPE_TYPES} onChange={(value) => onShapeChange('type', value)} />
        {shapeFieldsFor(emitter.shape.type).map((fieldName) => (
          <TextControl key={fieldName} label={fieldName} value={emitter.shape[fieldName] ?? 0} onChange={(value) => onShapeChange(fieldName, value)} />
        ))}
      </div>
      <p className="shape-type-description"><Icon name="info-circle" />{shapeDescriptionFor(emitter.shape.type)}</p>

      <h3><Icon name="activity" />Emission</h3>
      <div className="control-grid compact-controls">
        <SelectControl label="Type" value={emitter.emission.type} options={EMISSION_TYPES} onChange={(value) => onEmissionChange('type', value)} />
        <TextControl label="Count" value={emitter.emission.count ?? 1} onChange={(value) => onEmissionChange('count', value)} />
        <TextControl label="Rate" value={emitter.emission.rate ?? 10} onChange={(value) => onEmissionChange('rate', value)} />
        <TextControl label="Interval" value={emitter.emission.interval ?? 0.1} onChange={(value) => onEmissionChange('interval', value)} />
      </div>
      <label className="toggle-control">
        <input type="checkbox" checked={emitter.emission.loop === true} onChange={(event) => onEmissionChange('loop', event.target.checked)} />
        Loop emission
      </label>

      <h3><Icon name="stars" />Particle</h3>
      <div className="control-grid compact-controls">
        <TextControl label="Lifetime" value={emitter.particle?.lifetime ?? 1} onChange={(value) => onParticleChange('lifetime', value)} />
        <TextControl label="Size" value={emitter.particle?.size ?? 4} onChange={(value) => onParticleChange('size', value)} />
        <TextControl label="Speed" value={emitter.particle?.speed ?? 0} onChange={(value) => onParticleChange('speed', value)} />
        <TextControl label="Angle" value={emitter.particle?.angle ?? 0} onChange={(value) => onParticleChange('angle', value)} />
        <TextControl label="Gravity" value={emitter.particle?.gravity ?? 0} onChange={(value) => onParticleChange('gravity', value)} />
        <TextControl label="Alpha" value={emitter.particle?.alpha ?? 1} onChange={(value) => onParticleChange('alpha', value)} />
        <ColorControl label="Color" value={emitter.particle?.color ?? '#f4cd69'} onChange={(value) => onParticleChange('color', value)} />
        <SelectControl label="Sprite" value={emitter.particle?.spriteId ?? 'circle'} options={spriteOptions} onChange={(value) => onParticleChange('spriteId', value)} />
      </div>
    </div>
  );
}

function TrackEditor({ emitter, onTrackChange, onTrackRemove, onPhaseAdd, onPhaseRemove, onPhaseChange, onEndConditionChange }) {
  if (!emitter) {
    return <p>No emitter selected.</p>;
  }

  const tracks = emitter.particle?.tracks ?? [];

  if (tracks.length === 0) {
    return <p>{emitter.id} has no tracks.</p>;
  }

  return (
    <div className="track-editor-list">
      {tracks.map((track, trackIndex) => (
        <article className="track-card" key={`${track.property}-${trackIndex}`}>
          <div className="section-heading-row">
            <SelectControl
              label="Property"
              value={track.property}
              options={TRACK_PROPERTIES}
              onChange={(value) => onTrackChange(trackIndex, 'property', value)}
            />
            <button type="button" onClick={() => onTrackRemove(trackIndex)}><Icon name="trash3" />Remove</button>
          </div>
          <div className="section-heading-row phase-heading">
            <strong>{track.phases?.length ?? 1} phase(s)</strong>
            <button type="button" onClick={() => onPhaseAdd(trackIndex)}><Icon name="plus-lg" />Add Phase</button>
          </div>
          {(track.phases ?? []).map((phase, phaseIndex) => (
            <div className="phase-card" key={phaseIndex}>
              <div className="section-heading-row phase-heading">
                <strong><Icon name="bezier2" />Phase {phaseIndex + 1}</strong>
                <button type="button" onClick={() => onPhaseRemove(trackIndex, phaseIndex)}><Icon name="trash3" />Remove</button>
              </div>
              <div className="control-grid compact-controls">
                {track.property === 'color' ? (
                  <ColorControl label="From" value={phase.from ?? '#ffffff'} onChange={(value) => onPhaseChange(trackIndex, phaseIndex, 'from', value)} />
                ) : (
                  <TextControl label="From" value={phase.from ?? ''} onChange={(value) => onPhaseChange(trackIndex, phaseIndex, 'from', value)} />
                )}
                {track.property === 'color' ? (
                  <ColorControl label="To" value={phase.to ?? '#f4cd69'} onChange={(value) => onPhaseChange(trackIndex, phaseIndex, 'to', value)} />
                ) : (
                  <TextControl label="To" value={phase.to ?? ''} onChange={(value) => onPhaseChange(trackIndex, phaseIndex, 'to', value)} />
                )}
                <TextControl label="Duration" value={phase.duration ?? 1} onChange={(value) => onPhaseChange(trackIndex, phaseIndex, 'duration', value)} />
                <SelectControl
                  label="End"
                  value={phase.endCondition?.type ?? 'duration'}
                  options={END_CONDITION_TYPES}
                  onChange={(value) => onEndConditionChange(trackIndex, phaseIndex, 'type', value)}
                />
                <TextControl
                  label="End Value"
                  value={phase.endCondition?.value ?? ''}
                  onChange={(value) => onEndConditionChange(trackIndex, phaseIndex, 'value', value)}
                />
              </div>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

function TextControl({ label, value, onChange }) {
  const formattedValue = formatEditorValue(value);
  const [draftValue, setDraftValue] = useState(formattedValue);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(formattedValue);
    }
  }, [formattedValue, isEditing]);

  return (
    <label className="field-control">
      <span>{label}</span>
      <input
        value={isEditing ? draftValue : formattedValue}
        onFocus={() => setIsEditing(true)}
        onBlur={() => {
          setIsEditing(false);
          setDraftValue(formattedValue);
        }}
        onChange={(event) => {
          setDraftValue(event.target.value);
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function ColorControl({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentColor = normalizeHexColor(formatEditorValue(value)) ?? '#ffffff';
  const rgb = hexToRgb(currentColor);
  const hsv = rgbToHsv(rgb);

  function commitRgb(nextRgb) {
    onChange(rgbToHex(nextRgb));
  }

  function commitHsv(nextHsv) {
    commitRgb(hsvToRgb(nextHsv));
  }

  return (
    <div className="field-control color-control">
      <span>{label}</span>
      <div className="color-input-row">
        <button
          type="button"
          className="color-swatch-button"
          style={{ backgroundColor: currentColor }}
          aria-label={`Open ${label} color picker`}
          onClick={() => setIsOpen(true)}
        />
        <input value={formatEditorValue(value)} onChange={(event) => onChange(event.target.value)} />
      </div>
      {isOpen ? (
        <div className="color-modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <div className="color-picker-modal" role="dialog" aria-modal="true" aria-label={`${label} color picker`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading-row">
              <strong>{label}</strong>
              <button type="button" className="compact-action" onClick={() => setIsOpen(false)}>Done</button>
            </div>
            <div className="color-preview" style={{ backgroundColor: currentColor }}>
              <span>{currentColor}</span>
            </div>
            <ColorSlider label="Hue" value={hsv.h} min={0} max={360} gradient="linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" onChange={(nextValue) => commitHsv({ ...hsv, h: nextValue })} />
            <ColorSlider label="Sat" value={hsv.s} min={0} max={100} gradient={`linear-gradient(90deg, #ffffff, ${rgbToHex(hsvToRgb({ ...hsv, s: 100 }))})`} onChange={(nextValue) => commitHsv({ ...hsv, s: nextValue })} />
            <ColorSlider label="Val" value={hsv.v} min={0} max={100} gradient={`linear-gradient(90deg, #000000, ${rgbToHex(hsvToRgb({ ...hsv, v: 100 }))})`} onChange={(nextValue) => commitHsv({ ...hsv, v: nextValue })} />
            <div className="color-slider-grid">
              <ColorSlider label="R" value={rgb.r} min={0} max={255} onChange={(nextValue) => commitRgb({ ...rgb, r: nextValue })} />
              <ColorSlider label="G" value={rgb.g} min={0} max={255} onChange={(nextValue) => commitRgb({ ...rgb, g: nextValue })} />
              <ColorSlider label="B" value={rgb.b} min={0} max={255} onChange={(nextValue) => commitRgb({ ...rgb, b: nextValue })} />
            </div>
            <div className="color-reel" aria-label="Color reel">
              {COLOR_REEL.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color.toLowerCase() === currentColor.toLowerCase() ? 'is-active' : ''}
                  style={{ backgroundColor: color }}
                  aria-label={`Use ${color}`}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorSlider({ label, value, min, max, gradient, onChange }) {
  return (
    <label className="color-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        style={gradient ? { background: gradient } : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value}</output>
    </label>
  );
}

function Icon({ name }) {
  return <i className={`bi bi-${name}`} aria-hidden="true" />;
}

function presetIconFor(presetId) {
  return PRESET_ICONS[presetId] ?? 'stars';
}

const PRESET_ICONS = {
  explosion: 'stars',
  fire: 'fire',
  'realistic-fire': 'fire',
  'nova-point': 'bullseye',
  smoke: 'cloud-fog2',
  heal: 'heart-pulse',
  rain: 'cloud-rain-heavy',
};

const SHAPE_DESCRIPTIONS = {
  point: 'Sinh particle tại một điểm x/y cố định. Phù hợp flash, ring, hit marker hoặc core nhỏ.',
  nova_point: 'Sinh quanh emitter point với distanceOffset, rồi particle luôn tự xoay rotation để hướng về lại point. distanceOffset có thể là số hoặc {"min": x, "max": y}.',
  circle: 'Sinh particle ngẫu nhiên trong vùng tròn theo x/y/radius. Phù hợp aura, burst mềm và vùng tỏa đều.',
  line: 'Sinh particle dọc theo đoạn thẳng x1/y1 đến x2/y2. Phù hợp sparks, rain strip hoặc slash trail.',
  box: 'Sinh particle trong vùng chữ nhật x/y/width/height. Phù hợp mưa, bụi nền hoặc vùng spawn rộng.',
};

function shapeDescriptionFor(shapeType) {
  return SHAPE_DESCRIPTIONS[shapeType] ?? 'Shape type này dùng dữ liệu x/y mặc định để xác định điểm sinh particle.';
}

const COLOR_REEL = [
  '#ffffff',
  '#f4cd69',
  '#ff7a2f',
  '#ef4444',
  '#f43f5e',
  '#c084fc',
  '#60a5fa',
  '#22d3ee',
  '#34d399',
  '#a3e635',
  '#111612',
];

function normalizeHexColor(value) {
  const text = String(value ?? '').trim();

  if (/^#[0-9a-f]{6}$/i.test(text)) {
    return text.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(text)) {
    return `#${text.slice(1).split('').map((character) => character + character).join('')}`.toLowerCase();
  }

  return null;
}

function hexToRgb(hexColor) {
  const hex = normalizeHexColor(hexColor) ?? '#ffffff';
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsv({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    h: Math.round((hue + 360) % 360),
    s: Math.round(max === 0 ? 0 : (delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function hsvToRgb({ h, s, v }) {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const huePrime = (clamp(h, 0, 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="field-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function shapeFieldsFor(shapeType) {
  if (shapeType === 'nova_point') {
    return ['x', 'y', 'distanceOffset', 'angleOffset'];
  }

  if (shapeType === 'circle') {
    return ['x', 'y', 'radius'];
  }

  if (shapeType === 'line') {
    return ['x1', 'y1', 'x2', 'y2'];
  }

  if (shapeType === 'box') {
    return ['x', 'y', 'width', 'height'];
  }

  return ['x', 'y'];
}