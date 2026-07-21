import { create } from 'zustand';

export const DEFAULT_BACKGROUND_URL = '/img/background/forest.png';

export const PRESET_EFFECTS = [
  { id: 'explosion', label: 'Explosion', url: '/effects/explosion.json' },
  { id: 'fire', label: 'Fire', url: '/effects/fire.json' },
  { id: 'realistic-fire', label: 'Realistic Fire', url: '/effects/realistic_fire.json' },
  { id: 'smoke', label: 'Smoke', url: '/effects/smoke.json' },
  { id: 'heal', label: 'Heal', url: '/effects/heal.json' },
  { id: 'rain', label: 'Rain', url: '/effects/rain.json' },
];

export const useEditorStore = create((set) => ({
  effectJson: null,
  sourceName: 'No effect loaded',
  selectedEmitterId: null,
  backgroundUrl: DEFAULT_BACKGROUND_URL,
  backgroundName: 'forest.png',
  customAssets: [],
  stats: { instanceCount: 0, particleCount: 0, drawCount: 0 },
  status: 'Loading preset...',
  setEffectJson(effectJson, sourceName = effectJson?.id ?? 'Imported effect') {
    set((state) => {
      const selectedStillExists = effectJson?.emitters?.some(
        (emitter) => emitter.id === state.selectedEmitterId,
      );

      return {
        effectJson,
        sourceName,
        selectedEmitterId: selectedStillExists ? state.selectedEmitterId : effectJson?.emitters?.[0]?.id ?? null,
        status: `Loaded ${effectJson?.id ?? sourceName}`,
      };
    });
  },
  selectEmitter(selectedEmitterId) {
    set({ selectedEmitterId });
  },
  setBackground(backgroundUrl, backgroundName) {
    set({ backgroundUrl, backgroundName });
  },
  addCustomAsset(asset) {
    set((state) => ({
      customAssets: [...state.customAssets.filter((item) => item.id !== asset.id), asset],
    }));
  },
  renameCustomAsset(previousId, nextId) {
    set((state) => ({
      customAssets: state.customAssets.map((asset) => (
        asset.id === previousId ? { ...asset, id: nextId } : asset
      )),
    }));
  },
  setStats(stats) {
    set({ stats });
  },
  setStatus(status) {
    set({ status });
  },
}));