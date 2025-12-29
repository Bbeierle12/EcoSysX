import { PresetName, listPresets, getPresetDescription } from '@genesisx/core-engine';
import styles from './PresetSelector.module.css';

interface PresetSelectorProps {
  currentPreset: PresetName;
  onPresetChange: (preset: PresetName) => void;
}

const PRESET_ICONS: Record<PresetName, string> = {
  test: '🧪',
  small: '🌱',
  medium: '🌿',
  large: '🌳',
  survival: '⚔️',
  abundant: '🍀',
  fastEvolution: '⚡',
};

export function PresetSelector({ currentPreset, onPresetChange }: PresetSelectorProps) {
  const presets = listPresets();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Presets</h3>
      </div>

      <div className={styles.grid}>
        {presets.map((preset) => (
          <button
            key={preset}
            className={`${styles.presetButton} ${
              preset === currentPreset ? styles.active : ''
            }`}
            onClick={() => onPresetChange(preset)}
            title={getPresetDescription(preset)}
          >
            <span className={styles.icon}>{PRESET_ICONS[preset]}</span>
            <span className={styles.name}>{formatPresetName(preset)}</span>
          </button>
        ))}
      </div>

      <div className={styles.description}>
        {getPresetDescription(currentPreset)}
      </div>
    </div>
  );
}

function formatPresetName(name: PresetName): string {
  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
