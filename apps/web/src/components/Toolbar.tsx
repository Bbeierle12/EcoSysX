import { useState, useCallback, useRef } from 'react';
import {
  SimulationEngine,
  createSaveFile,
  generateSaveFilename,
  exportStatisticsCSV,
  loadSimulationFromFile,
} from '@genesisx/core-engine';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  simulation: SimulationEngine | null;
  timeScale: number;
  onTimeScaleChange: (scale: number) => void;
  onLoad: (simulation: SimulationEngine) => void;
}

const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

export function Toolbar({ simulation, timeScale, onTimeScaleChange, onLoad }: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    if (!simulation) return;

    const blob = createSaveFile(simulation);
    const filename = generateSaveFilename(simulation);
    downloadBlob(blob, filename);
  }, [simulation]);

  const handleExportCSV = useCallback(() => {
    if (!simulation) return;

    const csv = exportStatisticsCSV(simulation);
    const blob = new Blob([csv], { type: 'text/csv' });
    const tick = simulation.getCurrentTick();
    downloadBlob(blob, `genesisx-stats-tick${tick}.csv`);
    setShowExportMenu(false);
  }, [simulation]);

  const handleExportSnapshot = useCallback(() => {
    if (!simulation) return;

    const snapshot = simulation.createSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `genesisx-snapshot-tick${snapshot.tick}.json`);
    setShowExportMenu(false);
  }, [simulation]);

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const loadedSim = await loadSimulationFromFile(file);
      onLoad(loadedSim);
    } catch (error) {
      console.error('Failed to load simulation:', error);
      alert('Failed to load simulation file. Please check the file format.');
    } finally {
      setIsLoading(false);
      // Reset file input so the same file can be loaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onLoad]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.section}>
        <span className={styles.label}>Speed</span>
        <div className={styles.speedButtons}>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.speedButton} ${
                timeScale === opt.value ? styles.active : ''
              }`}
              onClick={() => onTimeScaleChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button
          className={styles.actionButton}
          onClick={handleLoadClick}
          disabled={isLoading}
          title="Load simulation"
        >
          <LoadIcon />
          <span>{isLoading ? 'Loading...' : 'Load'}</span>
        </button>

        <button
          className={styles.actionButton}
          onClick={handleSave}
          disabled={!simulation}
          title="Save simulation"
        >
          <SaveIcon />
          <span>Save</span>
        </button>

        <div className={styles.exportWrapper}>
          <button
            className={styles.actionButton}
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!simulation}
            title="Export data"
          >
            <ExportIcon />
            <span>Export</span>
            <ChevronIcon />
          </button>

          {showExportMenu && (
            <div className={styles.exportMenu}>
              <button onClick={handleExportCSV}>
                Statistics (CSV)
              </button>
              <button onClick={handleExportSnapshot}>
                Snapshot (JSON)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function LoadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}
