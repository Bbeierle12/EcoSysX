import { useEffect, useState } from 'react';
import { SimulationEngine, TickSnapshot } from '@genesisx/core-engine';
import { StatsPanelCharts } from './Charts';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  simulation: SimulationEngine | null;
}

interface Stats {
  population: number;
  maxPopulation: number;
  foodCount: number;
  maxFood: number;
  totalBirths: number;
  totalDeaths: number;
  totalFoodConsumed: number;
  maxGeneration: number;
  avgEnergy: number;
  tps: number;
  runtime: number;
  history: TickSnapshot[];
}

export function StatsPanel({ simulation }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!simulation) {
      setStats(null);
      return;
    }

    const updateStats = () => {
      const agentManager = simulation.getAgentManager();
      const foodManager = simulation.getFoodManager();
      const statistics = simulation.getStatistics();
      const summary = statistics.getSummary();
      const agentStats = agentManager.getStats();
      const foodStats = foodManager.getStats();

      const agents = agentManager.getAliveAgents();
      const avgEnergy =
        agents.length > 0
          ? agents.reduce((sum, a) => sum + a.energy, 0) / agents.length
          : 0;

      setStats({
        population: agentStats.alivePopulation,
        maxPopulation: agentManager.getConfig().maxPopulation,
        foodCount: foodStats.activeCount,
        maxFood: foodManager.getConfig().maxCount,
        totalBirths: summary.totalBirths,
        totalDeaths: summary.totalDeaths,
        totalFoodConsumed: summary.totalFoodConsumed,
        maxGeneration: agentStats.maxGenerationReached,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        tps: Math.round(summary.averageTicksPerSecond),
        runtime: summary.runTimeSeconds,
        history: statistics.getHistory(),
      });
    };

    // Update immediately and then every 100ms
    updateStats();
    const interval = setInterval(updateStats, 100);

    return () => clearInterval(interval);
  }, [simulation]);

  if (!stats) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Statistics</h3>
        </div>
        <div className={styles.empty}>No simulation</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Statistics</h3>
        <span className={styles.tps}>{stats.tps} TPS</span>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Population</h4>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Current</span>
          <span className={styles.statValue}>{stats.population}</span>
        </div>
        <ProgressBar
          value={stats.population}
          max={stats.maxPopulation}
          color="var(--color-accent-green)"
        />
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Births</span>
            <span className={styles.statValue}>{stats.totalBirths.toLocaleString()}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Deaths</span>
            <span className={styles.statValue}>{stats.totalDeaths.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Food</h4>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Available</span>
          <span className={styles.statValue}>{stats.foodCount}</span>
        </div>
        <ProgressBar
          value={stats.foodCount}
          max={stats.maxFood}
          color="var(--color-accent-yellow)"
        />
        <div className={styles.stat}>
          <span className={styles.statLabel}>Consumed</span>
          <span className={styles.statValue}>{stats.totalFoodConsumed.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Evolution</h4>
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Max Gen</span>
            <span className={styles.statValue}>{stats.maxGeneration}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg Energy</span>
            <span className={styles.statValue}>{stats.avgEnergy}</span>
          </div>
        </div>
      </div>

      <div className={styles.runtime}>
        Runtime: {formatRuntime(stats.runtime)}
      </div>

      <StatsPanelCharts history={stats.history} />
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
}

function ProgressBar({ value, max, color }: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
      <span className={styles.progressLabel}>
        {value} / {max}
      </span>
    </div>
  );
}

function formatRuntime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
