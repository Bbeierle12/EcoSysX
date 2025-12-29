/**
 * Agents module exports
 */

export {
  ActionType,
  type Action,
  type BaseAction,
  type MoveAction,
  type RotateAction,
  type EatAction,
  type ReproduceAction,
  type IdleAction,
  type ActionResult,
  Actions,
} from './Action';

export {
  Agent,
  type Position,
  type AgentConfig,
  type AgentStats,
  type AgentState,
  DEFAULT_AGENT_CONFIG,
} from './Agent';
