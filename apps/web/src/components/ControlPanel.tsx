import { SimulationState } from '@genesisx/core-engine';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  state: SimulationState;
  tick: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
}

export function ControlPanel({
  state,
  tick,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
}: ControlPanelProps) {
  const isRunning = state === SimulationState.RUNNING;
  const isPaused = state === SimulationState.PAUSED;

  const handlePlayPause = () => {
    if (isRunning) {
      onPause();
    } else if (isPaused) {
      onResume();
    } else {
      onStart();
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case SimulationState.RUNNING:
        return 'Running';
      case SimulationState.PAUSED:
        return 'Paused';
      case SimulationState.STEPPING:
        return 'Stepping';
      case SimulationState.IDLE:
      default:
        return 'Idle';
    }
  };

  const getStateColor = () => {
    switch (state) {
      case SimulationState.RUNNING:
        return 'var(--color-accent-green)';
      case SimulationState.PAUSED:
        return 'var(--color-accent-yellow)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Controls</h3>
        <span className={styles.state} style={{ color: getStateColor() }}>
          {getStateLabel()}
        </span>
      </div>

      <div className={styles.tickDisplay}>
        <span className={styles.tickLabel}>Tick</span>
        <span className={styles.tickValue}>{tick.toLocaleString()}</span>
      </div>

      <div className={styles.buttons}>
        <button
          className={`${styles.button} ${isRunning ? styles.pauseButton : styles.playButton}`}
          onClick={handlePlayPause}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>

        <button
          className={styles.button}
          onClick={onStep}
          disabled={isRunning}
          title="Step"
        >
          <StepIcon />
        </button>

        <button
          className={`${styles.button} ${styles.resetButton}`}
          onClick={onReset}
          title="Reset"
        >
          <ResetIcon />
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </svg>
  );
}
