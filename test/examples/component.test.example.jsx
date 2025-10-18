/**
 * Example React Component Test
 * 
 * This file demonstrates how to test React components in EcoSysX
 * using Vitest and React Testing Library.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * Example component to test
 * (This would be imported from actual component files)
 */
function SimulationControls({ onStart, onStop, onReset, isRunning }) {
  return (
    <div data-testid="simulation-controls">
      <button 
        onClick={onStart} 
        disabled={isRunning}
        data-testid="start-button"
      >
        Start
      </button>
      <button 
        onClick={onStop} 
        disabled={!isRunning}
        data-testid="stop-button"
      >
        Stop
      </button>
      <button 
        onClick={onReset}
        data-testid="reset-button"
      >
        Reset
      </button>
      <div data-testid="status">
        Status: {isRunning ? 'Running' : 'Stopped'}
      </div>
    </div>
  );
}

describe('SimulationControls Component', () => {
  let mockOnStart;
  let mockOnStop;
  let mockOnReset;

  beforeEach(() => {
    mockOnStart = vi.fn();
    mockOnStop = vi.fn();
    mockOnReset = vi.fn();
  });

  describe('Rendering', () => {
    it('should render all control buttons', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      expect(screen.getByTestId('start-button')).toBeDefined();
      expect(screen.getByTestId('stop-button')).toBeDefined();
      expect(screen.getByTestId('reset-button')).toBeDefined();
    });

    it('should display correct status when stopped', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Status: Stopped');
    });

    it('should display correct status when running', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Status: Running');
    });
  });

  describe('Button States', () => {
    it('should disable start button when simulation is running', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      const startButton = screen.getByTestId('start-button');
      expect(startButton.disabled).toBe(true);
    });

    it('should enable start button when simulation is stopped', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      const startButton = screen.getByTestId('start-button');
      expect(startButton.disabled).toBe(false);
    });

    it('should disable stop button when simulation is stopped', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      expect(stopButton.disabled).toBe(true);
    });

    it('should enable stop button when simulation is running', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      expect(stopButton.disabled).toBe(false);
    });

    it('should always enable reset button', () => {
      const { rerender } = render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      let resetButton = screen.getByTestId('reset-button');
      expect(resetButton.disabled).toBeFalsy();

      rerender(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      resetButton = screen.getByTestId('reset-button');
      expect(resetButton.disabled).toBeFalsy();
    });
  });

  describe('User Interactions', () => {
    it('should call onStart when start button is clicked', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      const startButton = screen.getByTestId('start-button');
      fireEvent.click(startButton);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when stop button is clicked', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      fireEvent.click(stopButton);

      expect(mockOnStop).toHaveBeenCalledTimes(1);
    });

    it('should call onReset when reset button is clicked', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      const resetButton = screen.getByTestId('reset-button');
      fireEvent.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it('should not call onStart when start button is disabled', () => {
      render(
        <SimulationControls
          onStart={mockOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={true}
        />
      );

      const startButton = screen.getByTestId('start-button');
      
      // Try to click disabled button
      fireEvent.click(startButton);

      // Handler should not be called because button is disabled
      expect(mockOnStart).not.toHaveBeenCalled();
    });
  });

  describe('Async Behavior', () => {
    it('should handle async start operation', async () => {
      const asyncOnStart = vi.fn().mockResolvedValue('started');

      render(
        <SimulationControls
          onStart={asyncOnStart}
          onStop={mockOnStop}
          onReset={mockOnReset}
          isRunning={false}
        />
      );

      const startButton = screen.getByTestId('start-button');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(asyncOnStart).toHaveBeenCalled();
      });
    });
  });
});

/**
 * Example of testing a component with state
 */
function AgentCounter() {
  const [count, setCount] = React.useState(0);

  return (
    <div data-testid="agent-counter">
      <div data-testid="count">Agents: {count}</div>
      <button onClick={() => setCount(count + 1)} data-testid="increment">
        Add Agent
      </button>
      <button onClick={() => setCount(count - 1)} data-testid="decrement">
        Remove Agent
      </button>
      <button onClick={() => setCount(0)} data-testid="reset-counter">
        Reset
      </button>
    </div>
  );
}

describe('AgentCounter Component', () => {
  describe('State Management', () => {
    it('should initialize with count of 0', () => {
      render(<AgentCounter />);
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 0');
    });

    it('should increment count when add button is clicked', () => {
      render(<AgentCounter />);
      
      const incrementButton = screen.getByTestId('increment');
      fireEvent.click(incrementButton);
      
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 1');
    });

    it('should decrement count when remove button is clicked', () => {
      render(<AgentCounter />);
      
      // First increment to 1
      fireEvent.click(screen.getByTestId('increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 1');
      
      // Then decrement back to 0
      fireEvent.click(screen.getByTestId('decrement'));
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 0');
    });

    it('should reset count to 0 when reset is clicked', () => {
      render(<AgentCounter />);
      
      // Increment multiple times
      fireEvent.click(screen.getByTestId('increment'));
      fireEvent.click(screen.getByTestId('increment'));
      fireEvent.click(screen.getByTestId('increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 3');
      
      // Reset
      fireEvent.click(screen.getByTestId('reset-counter'));
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 0');
    });

    it('should handle multiple rapid clicks', () => {
      render(<AgentCounter />);
      
      const incrementButton = screen.getByTestId('increment');
      
      // Click 5 times rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.click(incrementButton);
      }
      
      expect(screen.getByTestId('count')).toHaveTextContent('Agents: 5');
    });
  });
});

/**
 * Testing Best Practices Demonstrated:
 * 
 * 1. ✅ Use data-testid for reliable element selection
 * 2. ✅ Mock all props and callbacks
 * 3. ✅ Test rendering, states, and interactions separately
 * 4. ✅ Use descriptive test names
 * 5. ✅ Test disabled states and edge cases
 * 6. ✅ Use waitFor for async operations
 * 7. ✅ Test user workflows, not implementation
 * 8. ✅ Keep tests focused on one concept
 */
