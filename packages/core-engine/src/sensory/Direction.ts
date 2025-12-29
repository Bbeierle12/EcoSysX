/**
 * Direction.ts - Directional constants and utilities for sensing
 */

export enum Direction {
  FRONT = 'front',
  FRONT_LEFT = 'front_left',
  FRONT_RIGHT = 'front_right',
  LEFT = 'left',
  RIGHT = 'right',
  BACK = 'back',
}

export const DIRECTION_ANGLES: Record<Direction, number> = {
  [Direction.FRONT]: 0,
  [Direction.FRONT_LEFT]: Math.PI / 4,
  [Direction.FRONT_RIGHT]: -Math.PI / 4,
  [Direction.LEFT]: Math.PI / 2,
  [Direction.RIGHT]: -Math.PI / 2,
  [Direction.BACK]: Math.PI,
};

export const DIRECTION_CONE_WIDTHS: Record<Direction, number> = {
  [Direction.FRONT]: Math.PI / 6,
  [Direction.FRONT_LEFT]: Math.PI / 4,
  [Direction.FRONT_RIGHT]: Math.PI / 4,
  [Direction.LEFT]: Math.PI / 4,
  [Direction.RIGHT]: Math.PI / 4,
  [Direction.BACK]: Math.PI / 3,
};

export interface Vector2D {
  x: number;
  y: number;
}

export function rotationToVector(rotation: number): Vector2D {
  return {
    x: Math.cos(rotation),
    y: Math.sin(rotation),
  };
}

export function getWorldDirection(agentRotation: number, direction: Direction): Vector2D {
  const worldAngle = agentRotation + DIRECTION_ANGLES[direction];
  return rotationToVector(worldAngle);
}

export function angleBetween(v1: Vector2D, v2: Vector2D): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

export function distance(p1: Vector2D, p2: Vector2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2D): Vector2D {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function directionTo(from: Vector2D, to: Vector2D): Vector2D {
  return normalize({
    x: to.x - from.x,
    y: to.y - from.y,
  });
}

export function isInDirectionCone(
  agentPos: Vector2D,
  agentRotation: number,
  targetPos: Vector2D,
  direction: Direction,
  range: number
): boolean {
  const dist = distance(agentPos, targetPos);
  if (dist > range || dist === 0) return false;

  const toTarget = directionTo(agentPos, targetPos);
  const sensorDirection = getWorldDirection(agentRotation, direction);
  const angle = angleBetween(toTarget, sensorDirection);
  const coneWidth = DIRECTION_CONE_WIDTHS[direction];

  return angle <= coneWidth / 2;
}

export function getAllDirections(): Direction[] {
  return [
    Direction.FRONT,
    Direction.FRONT_LEFT,
    Direction.FRONT_RIGHT,
    Direction.LEFT,
    Direction.RIGHT,
    Direction.BACK,
  ];
}

export function getFrontDirections(): Direction[] {
  return [Direction.FRONT, Direction.FRONT_LEFT, Direction.FRONT_RIGHT];
}
