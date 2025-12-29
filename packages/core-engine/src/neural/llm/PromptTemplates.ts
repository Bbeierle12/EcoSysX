/**
 * PromptTemplates.ts - Templates for LLM agent reasoning
 */

export const AGENT_REASONING_PROMPT = `
You are a creature in an ecosystem simulation trying to survive and thrive.

Current state:
- Energy: {energy}%
- Food ahead: {frontFood}
- Food left: {leftFood}
- Food right: {rightFood}
- Agents nearby: {agentCount}

What action should you take? Choose one:
- MOVE_FORWARD
- TURN_LEFT
- TURN_RIGHT
- EAT
- REPRODUCE
- IDLE

Respond with just the action name.
`;

export interface SensoryInputForPrompt {
  energy?: number;
  frontFood?: number;
  frontLeftFood?: number;
  frontRightFood?: number;
  frontAgent?: number;
  frontLeftAgent?: number;
  frontRightAgent?: number;
}

export function formatPrompt(template: string, input: SensoryInputForPrompt): string {
  let formatted = template;

  const replacements: Record<string, string | number> = {
    energy: Math.round((input.energy ?? 0) * 100),
    frontFood: (input.frontFood ?? 0) > 0.1 ? 'Yes' : 'No',
    leftFood: (input.frontLeftFood ?? 0) > 0.1 ? 'Yes' : 'No',
    rightFood: (input.frontRightFood ?? 0) > 0.1 ? 'Yes' : 'No',
    agentCount: Math.round(
      ((input.frontAgent ?? 0) + (input.frontLeftAgent ?? 0) + (input.frontRightAgent ?? 0)) * 10
    ),
  };

  for (const [key, value] of Object.entries(replacements)) {
    formatted = formatted.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }

  return formatted;
}

export function parseAction(response: string): string {
  const validActions = [
    'MOVE_FORWARD',
    'TURN_LEFT',
    'TURN_RIGHT',
    'EAT',
    'REPRODUCE',
    'IDLE',
  ];

  const cleaned = response.toUpperCase().trim();

  if (validActions.includes(cleaned)) {
    return cleaned;
  }

  for (const action of validActions) {
    if (cleaned.includes(action)) {
      return action;
    }
  }

  const actionMatch = cleaned.match(/ACTION:\s*(\w+)/);
  if (actionMatch && validActions.includes(actionMatch[1])) {
    return actionMatch[1];
  }

  return 'IDLE';
}
