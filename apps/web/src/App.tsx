import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SimulationEngine,
  createSimulationBuilder,
  PresetName,
  Observer,
  createObserver,
  SimulationState,
  createSaveFile,
  generateSaveFilename,
} from '@genesisx/core-engine';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { PresetSelector } from './components/PresetSelector';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel, RenderSettings, DEFAULT_RENDER_SETTINGS } from './components/SettingsPanel';
import { AgentInspector } from './components/AgentInspector';
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts';
import styles from './App.module.css';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function App() {
  const [simulation, setSimulation] = useState<SimulationEngine | null>(null);
  const [observer, setObserver] = useState<Observer | null>(null);
  const [simState, setSimState] = useState<SimulationState>(SimulationState.IDLE);
  const [tick, setTick] = useState(0);
  const [preset, setPreset] = useState<PresetName>('medium');
  const [timeScale, setTimeScale] = useState(1);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(DEFAULT_RENDER_SETTINGS);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const initSimulation = useCallback((presetName: PresetName) => {
    // Clean up existing simulation
    if (simulation) {
      simulation.destroy();
    }
    if (observer) {
      observer.destroy();
    }

    // Create new simulation
    const sim = createSimulationBuilder()
      .fromPreset(presetName)
      .onStateChange((_, newState) => setSimState(newState))
      .onTick((currentTick) => setTick(currentTick))
      .buildAndInitialize();

    // Create observer
    const obs = createObserver(sim);

    setSimulation(sim);
    setObserver(obs);
    setSimState(sim.getState());
    setTick(0);
    setPreset(presetName);
    setTimeScale(1);
    setSelectedAgentId(null);
  }, [simulation, observer]);

  // Initialize with default preset on mount
  useEffect(() => {
    initSimulation('medium');
    return () => {
      simulation?.destroy();
      observer?.destroy();
    };
  }, []);

  const handleStart = useCallback(() => {
    simulation?.start();
  }, [simulation]);

  const handlePause = useCallback(() => {
    simulation?.pause();
  }, [simulation]);

  const handleResume = useCallback(() => {
    simulation?.resume();
  }, [simulation]);

  const handleStep = useCallback(() => {
    simulation?.step(1);
  }, [simulation]);

  const handleReset = useCallback(() => {
    initSimulation(preset);
  }, [initSimulation, preset]);

  const handlePresetChange = useCallback((newPreset: PresetName) => {
    initSimulation(newPreset);
  }, [initSimulation]);

  const handleTimeScaleChange = useCallback((scale: number) => {
    setTimeScale(scale);
    simulation?.setTimeScale(scale);
  }, [simulation]);

  const handlePlayPause = useCallback(() => {
    if (simState === SimulationState.RUNNING) {
      handlePause();
    } else if (simState === SimulationState.PAUSED) {
      handleResume();
    } else {
      handleStart();
    }
  }, [simState, handlePause, handleResume, handleStart]);

  const handleSpeedUp = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(timeScale);
    if (currentIndex < SPEED_OPTIONS.length - 1) {
      handleTimeScaleChange(SPEED_OPTIONS[currentIndex + 1]);
    }
  }, [timeScale, handleTimeScaleChange]);

  const handleSlowDown = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(timeScale);
    if (currentIndex > 0) {
      handleTimeScaleChange(SPEED_OPTIONS[currentIndex - 1]);
    }
  }, [timeScale, handleTimeScaleChange]);

  const handleToggleGrid = useCallback(() => {
    setRenderSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const handleSave = useCallback(() => {
    if (!simulation) return;
    const blob = createSaveFile(simulation);
    const filename = generateSaveFilename(simulation);
    downloadBlob(blob, filename);
  }, [simulation]);

  const handleAgentSelect = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  const handleLoad = useCallback((loadedSim: SimulationEngine) => {
    // Clean up existing simulation
    if (simulation) {
      simulation.destroy();
    }
    if (observer) {
      observer.destroy();
    }

    // Create observer for loaded simulation
    const obs = createObserver(loadedSim);

    setSimulation(loadedSim);
    setObserver(obs);
    setSimState(loadedSim.getState());
    setTick(loadedSim.getCurrentTick());
    setTimeScale(loadedSim.getTimeScale());
    setSelectedAgentId(null);
  }, [simulation, observer]);

  // Get selected agent data from observer
  const selectedAgent = useMemo(() => {
    if (!observer || !selectedAgentId) return null;
    const view = observer.getView();
    return view.agents.find((a) => a.id === selectedAgentId) ?? null;
  }, [observer, selectedAgentId, tick]); // Re-compute on tick change

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onStep: handleStep,
    onReset: handleReset,
    onSpeedUp: handleSpeedUp,
    onSlowDown: handleSlowDown,
    onToggleGrid: handleToggleGrid,
    onSave: handleSave,
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>GenesisX</h1>
          <span className={styles.subtitle}>Ecosystem Simulator</span>
        </div>

        <Toolbar
          simulation={simulation}
          timeScale={timeScale}
          onTimeScaleChange={handleTimeScaleChange}
          onLoad={handleLoad}
        />

        <button
          className={styles.helpButton}
          onClick={() => setShowShortcuts(!showShortcuts)}
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </header>

      {showShortcuts && (
        <div className={styles.shortcutsOverlay} onClick={() => setShowShortcuts(false)}>
          <div className={styles.shortcutsPanel} onClick={(e) => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
            <div className={styles.shortcutsList}>
              {SHORTCUTS.map((s) => (
                <div key={s.key} className={styles.shortcutItem}>
                  <kbd>{s.key}</kbd>
                  <span>{s.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        <div className={styles.canvasContainer}>
          <SimulationCanvas
            simulation={simulation}
            observer={observer}
            settings={renderSettings}
            selectedAgentId={selectedAgentId}
            onAgentSelect={handleAgentSelect}
          />
          <AgentInspector
            agent={selectedAgent}
            onClose={() => setSelectedAgentId(null)}
          />
        </div>

        <aside className={styles.sidebar}>
          <PresetSelector
            currentPreset={preset}
            onPresetChange={handlePresetChange}
          />

          <ControlPanel
            state={simState}
            tick={tick}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStep={handleStep}
            onReset={handleReset}
          />

          <StatsPanel simulation={simulation} />

          <SettingsPanel
            settings={renderSettings}
            onSettingsChange={setRenderSettings}
          />
        </aside>
      </main>
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
