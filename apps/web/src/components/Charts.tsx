import { useRef, useEffect, useMemo } from 'react';
import { TickSnapshot } from '@genesisx/core-engine';
import styles from './Charts.module.css';

interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  minY?: number;
  maxY?: number;
}

export function LineChart({
  data,
  height = 100,
  color = '#4ade80',
  fillColor = 'rgba(74, 222, 128, 0.1)',
  showGrid = true,
  minY,
  maxY,
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 10, right: 10, bottom: 20, left: 40 };

    // Clear
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, chartHeight);

    if (data.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data', width / 2, chartHeight / 2);
      return;
    }

    // Calculate bounds
    const dataMin = minY ?? Math.min(...data);
    const dataMax = maxY ?? Math.max(...data);
    const range = Math.max(dataMax - dataMin, 1);
    const yMin = dataMin - range * 0.05;
    const yMax = dataMax + range * 0.05;

    const chartW = width - padding.left - padding.right;
    const chartH = chartHeight - padding.top - padding.bottom;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const value = yMax - ((yMax - yMin) / 4) * i;
      ctx.fillText(formatNumber(value), padding.left - 5, y + 3);
    }

    // Draw line
    const getX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const getY = (value: number) => padding.top + ((yMax - value) / (yMax - yMin)) * chartH;

    // Fill area
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.lineTo(getX(data.length - 1), padding.top + chartH);
    ctx.lineTo(getX(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw current value
    if (data.length > 0) {
      const lastValue = data[data.length - 1];
      const lastX = getX(data.length - 1);
      const lastY = getY(lastValue);

      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [data, color, fillColor, showGrid, minY, maxY]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.chart}
      style={{ height: `${height}px` }}
    />
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  maxValue?: number;
}

export function BarChart({ data, height = 100, maxValue }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;
    const padding = { top: 10, right: 10, bottom: 30, left: 10 };

    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, chartHeight);

    if (data.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data', width / 2, chartHeight / 2);
      return;
    }

    const chartW = width - padding.left - padding.right;
    const chartH = chartHeight - padding.top - padding.bottom;
    const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
    const barWidth = Math.min(chartW / data.length - 4, 30);
    const gap = (chartW - barWidth * data.length) / (data.length + 1);

    for (let i = 0; i < data.length; i++) {
      const { label, value, color = '#4ade80' } = data[i];
      const barHeight = (value / max) * chartH;
      const x = padding.left + gap + i * (barWidth + gap);
      const y = padding.top + chartH - barHeight;

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw label
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barWidth / 2, chartHeight - 8);

      // Draw value on top
      if (value > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 4);
      }
    }
  }, [data, maxValue]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.chart}
      style={{ height: `${height}px` }}
    />
  );
}

interface StatsPanelChartsProps {
  history: TickSnapshot[];
}

export function StatsPanelCharts({ history }: StatsPanelChartsProps) {
  const populationData = useMemo(() => {
    return history.map((s) => s.population.count);
  }, [history]);

  const foodData = useMemo(() => {
    return history.map((s) => s.food.activeCount);
  }, [history]);

  const generationDistribution = useMemo(() => {
    if (history.length === 0) return [];

    const latest = history[history.length - 1];
    const genCounts: Record<string, number> = {};

    // Group by generation ranges
    const maxGen = latest.population.maxGeneration;
    const step = Math.max(1, Math.ceil(maxGen / 6));

    for (let gen = 0; gen <= maxGen; gen += step) {
      const label = step === 1 ? `${gen}` : `${gen}-${Math.min(gen + step - 1, maxGen)}`;
      genCounts[label] = 0;
    }

    // We don't have per-agent data in TickSnapshot, so show current max generation
    // This is a simplified visualization
    if (maxGen >= 0) {
      const label = step === 1 ? `${maxGen}` : `${Math.floor(maxGen / step) * step}-${maxGen}`;
      genCounts[label] = latest.population.count;
    }

    return Object.entries(genCounts).map(([label, value]) => ({
      label,
      value,
      color: `hsl(${(parseInt(label) || 0) * 20 % 360}, 70%, 50%)`,
    }));
  }, [history]);

  if (history.length < 2) {
    return (
      <div className={styles.emptyState}>
        Run simulation to see charts
      </div>
    );
  }

  return (
    <div className={styles.chartsContainer}>
      <div className={styles.chartSection}>
        <h4 className={styles.chartTitle}>Population</h4>
        <LineChart
          data={populationData}
          color="#4ade80"
          fillColor="rgba(74, 222, 128, 0.1)"
          height={80}
          minY={0}
        />
      </div>

      <div className={styles.chartSection}>
        <h4 className={styles.chartTitle}>Food</h4>
        <LineChart
          data={foodData}
          color="#fbbf24"
          fillColor="rgba(251, 191, 36, 0.1)"
          height={80}
          minY={0}
        />
      </div>

      {generationDistribution.length > 0 && (
        <div className={styles.chartSection}>
          <h4 className={styles.chartTitle}>Generation Distribution</h4>
          <BarChart data={generationDistribution} height={80} />
        </div>
      )}
    </div>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toString();
}
