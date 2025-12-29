/**
 * Action.ts - Action types for agent behavior
 */

export enum ActionType {
  MOVE = 'MOVE',
  ROTATE = 'ROTATE',
  EAT = 'EAT',
  REPRODUCE = 'REPRODUCE',
  IDLE = 'IDLE',
}

export interface BaseAction {
  type: ActionType;
  timestamp: number;
}

export interface MoveAction extends BaseAction {
  type: ActionType.MOVE;
  speed: number;
}

export interface RotateAction extends BaseAction {
  type: ActionType.ROTATE;
  angleDelta: number;
}

export interface EatAction extends BaseAction {
  type: ActionType.EAT;
  targetId?: string;
}

export interface ReproduceAction extends BaseAction {
  type: ActionType.REPRODUCE;
  mateId?: string;
}

export interface IdleAction extends BaseAction {
  type: ActionType.IDLE;
}

export type Action = MoveAction | RotateAction | EatAction | ReproduceAction | IdleAction;

export interface ActionResult {
  success: boolean;
  energyCost: number;
  message?: string;
}

export const Actions = {
  move(speed: number): MoveAction {
    return {
      type: ActionType.MOVE,
      speed: Math.max(0, Math.min(1, speed)),
      timestamp: Date.now(),
    };
  },

  rotate(angleDelta: number): RotateAction {
    return {
      type: ActionType.ROTATE,
      angleDelta,
      timestamp: Date.now(),
    };
  },

  eat(targetId?: string): EatAction {
    return {
      type: ActionType.EAT,
      targetId,
      timestamp: Date.now(),
    };
  },

  reproduce(mateId?: string): ReproduceAction {
    return {
      type: ActionType.REPRODUCE,
      mateId,
      timestamp: Date.now(),
    };
  },

  idle(): IdleAction {
    return {
      type: ActionType.IDLE,
      timestamp: Date.now(),
    };
  },
};
