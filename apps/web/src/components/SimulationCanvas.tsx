import { useRef, useEffect, useCallback, useState } from 'react';
import {
  SimulationEngine,
  Observer,
  AgentView,
  FoodView,
  energyToColor,
  generationToColor,
} from '@genesisx/core-engine';
import { RenderSettings } from './SettingsPanel';
import styles from './SimulationCanvas.module.css';

interface SimulationCanvasProps {
  simulation: SimulationEngine | null;
  observer: Observer | null;
  settings: RenderSettings;
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

const COLORS = {
  background: '#0f0f1a',
  grid: '#1a1a2e',
  agent: '#4ade80',
  agentDead: '#6b7280',
  agentSelected: '#22d3ee',
  food: '#fbbf24',
  foodDepleted: '#78350f',
};

export function SimulationCanvas({
  simulation,
  observer,
  settings,
  selectedAgentId,
  onAgentSelect,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Calculate scale to fit world
        if (simulation) {
          const worldConfig = simulation.getConfig();
          const worldWidth = worldConfig.world.dimensions.width;
          const worldHeight = worldConfig.world.dimensions.height;
          const scaleX = width / worldWidth;
          const scaleY = height / worldHeight;
          setScale(Math.min(scaleX, scaleY) * 0.95);
          setOffset({
            x: (width - worldWidth * Math.min(scaleX, scaleY) * 0.95) / 2,
            y: (height - worldHeight * Math.min(scaleX, scaleY) * 0.95) / 2,
          });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [simulation]);

  // Handle click to select agent
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!observer) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Convert screen coordinates to world coordinates
      const worldX = (clickX - offset.x) / scale;
      const worldY = (clickY - offset.y) / scale;

      const view = observer.getView();
      const hitRadius = settings.agentSize * 2;

      // Find closest agent within hit radius
      let closestAgent: AgentView | null = null;
      let closestDistance = hitRadius;

      for (const agent of view.agents) {
        const dx = agent.x - worldX;
        const dy = agent.y - worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestAgent = agent;
        }
      }

      onAgentSelect(closestAgent?.id ?? null);
    },
    [observer, offset, scale, settings.agentSize, onAgentSelect]
  );

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !observer) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    const view = observer.getView();
    const dpr = window.devicePixelRatio;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw grid
    if (settings.showGrid) {
      drawGrid(ctx, view.world.width, view.world.height);
    }

    // Draw world border
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, view.world.width, view.world.height);

    // Draw food
    for (const food of view.food) {
      drawFood(ctx, food, settings);
    }

    // Draw agents
    for (const agent of view.agents) {
      drawAgent(ctx, agent, settings, agent.id === selectedAgentId);
    }

    ctx.restore();

    // Draw overlay info
    drawOverlay(ctx, view.tick, view.agents.length, view.food.length);

    animationRef.current = requestAnimationFrame(render);
  }, [observer, scale, offset, settings, selectedAgentId]);

  // Start render loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleClick}
        style={{ cursor: 'crosshair' }}
      />
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const spacing = 50;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.beginPath();

  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  food: FoodView,
  settings: RenderSettings
) {
  if (food.isConsumed) return;

  const color = energyToColor(
    food.energy,
    food.maxEnergy,
    COLORS.food,
    COLORS.foodDepleted
  );

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(food.x, food.y, settings.foodSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: AgentView,
  settings: RenderSettings,
  isSelected: boolean
) {
  const size = settings.agentSize;

  // Determine color
  let color: string;
  if (isSelected) {
    color = COLORS.agentSelected;
  } else if (!agent.isAlive) {
    color = COLORS.agentDead;
  } else if (settings.colorByGeneration) {
    color = generationToColor(agent.generation);
  } else {
    color = energyToColor(
      agent.energy,
      agent.maxEnergy,
      COLORS.agent,
      COLORS.agentDead
    );
  }

  ctx.save();
  ctx.translate(agent.x, agent.y);
  ctx.rotate(agent.rotation);

  // Draw body (triangle pointing in direction)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.6);
  ctx.lineTo(-size * 0.7, size * 0.6);
  ctx.closePath();
  ctx.fill();

  // Draw selection ring
  if (isSelected) {
    ctx.strokeStyle = COLORS.agentSelected;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw direction indicator
  if (settings.showAgentDirection && agent.isAlive) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 1.5, 0);
    ctx.stroke();
  }

  ctx.restore();

  // Draw energy bar
  if (settings.showAgentEnergy && agent.isAlive) {
    const barWidth = size * 2;
    const barHeight = 3;
    const energyRatio = agent.energy / agent.maxEnergy;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(agent.x - barWidth / 2, agent.y - size - 6, barWidth, barHeight);

    ctx.fillStyle = energyRatio > 0.3 ? COLORS.agent : '#f87171';
    ctx.fillRect(
      agent.x - barWidth / 2,
      agent.y - size - 6,
      barWidth * energyRatio,
      barHeight
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  tick: number,
  agentCount: number,
  foodCount: number
) {
  const dpr = window.devicePixelRatio;
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 10, 150, 70);

  ctx.fillStyle = '#e0e0e0';
  ctx.font = '12px monospace';
  ctx.fillText(`Tick: ${tick.toLocaleString()}`, 20, 30);
  ctx.fillText(`Agents: ${agentCount}`, 20, 48);
  ctx.fillText(`Food: ${foodCount}`, 20, 66);

  ctx.restore();
}
