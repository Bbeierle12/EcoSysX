import { AgentView } from '@genesisx/core-engine';
import styles from './AgentInspector.module.css';

interface AgentInspectorProps {
  agent: AgentView | null;
  onClose: () => void;
}

export function AgentInspector({ agent, onClose }: AgentInspectorProps) {
  if (!agent) return null;

  const energyPercent = Math.round((agent.energy / agent.maxEnergy) * 100);
  const rotationDeg = Math.round((agent.rotation * 180) / Math.PI);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Agent Inspector</h3>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.row}>
          <span className={styles.label}>ID</span>
          <span className={styles.value}>{agent.id}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Status</span>
          <span className={`${styles.value} ${agent.isAlive ? styles.alive : styles.dead}`}>
            {agent.isAlive ? 'Alive' : 'Dead'}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Position</h4>
        <div className={styles.row}>
          <span className={styles.label}>X</span>
          <span className={styles.value}>{agent.x.toFixed(1)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Y</span>
          <span className={styles.value}>{agent.y.toFixed(1)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Rotation</span>
          <span className={styles.value}>{rotationDeg}&deg;</span>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Stats</h4>
        <div className={styles.row}>
          <span className={styles.label}>Energy</span>
          <span className={styles.value}>
            {agent.energy.toFixed(0)} / {agent.maxEnergy}
          </span>
        </div>
        <div className={styles.energyBar}>
          <div
            className={styles.energyFill}
            style={{
              width: `${energyPercent}%`,
              backgroundColor: energyPercent > 30 ? 'var(--color-accent-green)' : '#f87171',
            }}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Generation</span>
          <span className={styles.value}>{agent.generation}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Age</span>
          <span className={styles.value}>{agent.age} ticks</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Lineage</span>
          <span className={styles.value} title={agent.lineageId}>
            {agent.lineageId.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  );
}
