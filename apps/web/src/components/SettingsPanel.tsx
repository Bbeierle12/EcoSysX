import styles from './SettingsPanel.module.css';

export interface RenderSettings {
  showGrid: boolean;
  showAgentDirection: boolean;
  showAgentEnergy: boolean;
  colorByGeneration: boolean;
  agentSize: number;
  foodSize: number;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  showGrid: false,
  showAgentDirection: true,
  showAgentEnergy: false,
  colorByGeneration: false,
  agentSize: 8,
  foodSize: 6,
};

interface SettingsPanelProps {
  settings: RenderSettings;
  onSettingsChange: (settings: RenderSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const updateSetting = <K extends keyof RenderSettings>(
    key: K,
    value: RenderSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Display</h3>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Visibility</h4>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.showGrid}
            onChange={(e) => updateSetting('showGrid', e.target.checked)}
          />
          <span className={styles.toggleLabel}>Show Grid</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.showAgentDirection}
            onChange={(e) => updateSetting('showAgentDirection', e.target.checked)}
          />
          <span className={styles.toggleLabel}>Agent Direction</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.showAgentEnergy}
            onChange={(e) => updateSetting('showAgentEnergy', e.target.checked)}
          />
          <span className={styles.toggleLabel}>Energy Bars</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.colorByGeneration}
            onChange={(e) => updateSetting('colorByGeneration', e.target.checked)}
          />
          <span className={styles.toggleLabel}>Color by Generation</span>
        </label>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Entity Size</h4>

        <label className={styles.slider}>
          <span className={styles.sliderLabel}>Agents</span>
          <input
            type="range"
            min="4"
            max="16"
            value={settings.agentSize}
            onChange={(e) => updateSetting('agentSize', parseInt(e.target.value))}
          />
          <span className={styles.sliderValue}>{settings.agentSize}px</span>
        </label>

        <label className={styles.slider}>
          <span className={styles.sliderLabel}>Food</span>
          <input
            type="range"
            min="3"
            max="12"
            value={settings.foodSize}
            onChange={(e) => updateSetting('foodSize', parseInt(e.target.value))}
          />
          <span className={styles.sliderValue}>{settings.foodSize}px</span>
        </label>
      </div>
    </div>
  );
}
