# AI Agent Coding Conventions

This document provides specific guidelines for AI agents and AI-assisted development contributing to EcoSysX. These conventions ensure consistency, maintainability, and high-quality contributions across the multi-language, multi-framework codebase.

## Table of Contents

- [General Principles](#general-principles)
- [Module Scope & Boundaries](#module-scope--boundaries)
- [Coding Conventions by Language](#coding-conventions-by-language)
- [Test Policy](#test-policy)
- [Documentation Standards](#documentation-standards)
- [Integration Protocols](#integration-protocols)
- [Common Patterns](#common-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## General Principles

### 1. Understand Before Implementing

- **Read existing code**: Understand current patterns and architecture
- **Check dependencies**: Know what modules/services you depend on
- **Review tests**: See how components are tested
- **Follow conventions**: Match existing code style

### 2. Incremental Changes

- **Small, focused commits**: One logical change per commit
- **Test incrementally**: Verify each step works
- **Document as you go**: Don't leave docs for later
- **Refactor carefully**: Preserve existing functionality

### 3. Context Awareness

- **Know your module**: Understand the scope of your changes
- **Respect boundaries**: Don't modify unrelated modules
- **Check interfaces**: Ensure API compatibility
- **Verify integration**: Test with dependent services

## Module Scope & Boundaries

### Frontend (React/Vite)

**Location**: `src/`

**Scope**:
- UI components and visualization
- State management
- Frontend routing
- WebGL/GPU rendering interfaces
- API client for backend services

**Dependencies**:
- React, Three.js, WebGL
- Core engine via `packages/genx-engine`
- Backend services via HTTP/WebSocket

**Boundaries**:
- ❌ No direct database access
- ❌ No business logic (delegate to services)
- ✅ Presentation and user interaction only

### Qt GUI Application

**Location**: `qt-gui/`

**Scope**:
- Native desktop application
- Real-time performance monitoring
- Direct engine integration
- System-level optimizations

**Dependencies**:
- Qt 6.9.3+ (Widgets, Core, Test)
- CMake build system
- C++17 standard

**Boundaries**:
- ❌ No web-specific code
- ❌ Independent from React frontend
- ✅ Direct engine calls via C++ API
- ✅ Platform-specific optimizations

**Key Files**:
- `src/main.cpp`: Entry point
- `src/MainWindow.{h,cpp}`: Main window
- `src/core/`: Core engine integration
- `tests/`: Test suite

### Core Engine

**Location**: `packages/genx-engine/`

**Scope**:
- Core simulation logic
- Agent behavior primitives
- World state management
- Performance optimization

**Dependencies**:
- TypeScript/JavaScript
- Minimal external dependencies

**Boundaries**:
- ❌ No UI code
- ❌ No service-specific logic
- ✅ Pure computation and state
- ✅ Framework-agnostic APIs

### Services

#### Julia Agent Sidecar

**Location**: `services/agents-sidecar/`

**Scope**:
- High-performance agent computation
- Scientific computing algorithms
- Parallel/distributed processing

**Conventions**:
- Use Julia's type system effectively
- Leverage multiple dispatch
- Optimize for numerical computation
- Document mathematical algorithms

#### LLM Service

**Location**: `services/llama-service/`

**Scope**:
- Language model integration
- Agent intelligence layer
- Natural language processing

**Conventions**:
- Async API design
- Proper error handling
- Rate limiting awareness
- Model versioning

#### Engine/Mason/Mesa Sidecars

**Location**: `services/{engine,mason,mesa}-sidecar/`

**Scope**:
- Service-specific adapters
- Protocol translation
- Integration bridges

## Coding Conventions by Language

### JavaScript/TypeScript

```javascript
// ✅ Good: Modern ES6+, clear naming
export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  
  /**
   * Add an agent to the simulation
   * @param agent - The agent to add
   * @returns The agent ID
   */
  async addAgent(agent: Agent): Promise<string> {
    const id = crypto.randomUUID();
    this.agents.set(id, agent);
    return id;
  }
}

// ❌ Bad: Old patterns, unclear names
var mgr = {
  a: [],
  add: function(x, cb) {
    var i = this.a.length;
    this.a.push(x);
    cb(null, i);
  }
};
```

### C++ (Qt)

```cpp
// ✅ Good: Modern C++17, Qt conventions, smart pointers
class PerformanceMonitor : public QObject {
  Q_OBJECT
  
public:
  explicit PerformanceMonitor(QObject *parent = nullptr);
  ~PerformanceMonitor() override = default;
  
  /**
   * @brief Update performance metrics
   * @param deltaTime Time since last update in seconds
   */
  void updateMetrics(double deltaTime);
  
signals:
  void metricsUpdated(const PerformanceMetrics &metrics);
  
private:
  std::unique_ptr<MetricsCollector> m_collector;
  QTimer *m_updateTimer{nullptr};
};

// ❌ Bad: Raw pointers, no docs, poor naming
class PM {
public:
  PM() { c = new Collector(); }
  ~PM() { delete c; }
  void upd(double d);
private:
  Collector* c;
};
```

### Julia

```julia
# ✅ Good: Descriptive names, documented, typed
"""
    compute_agent_interactions(agents::Vector{Agent}, radius::Float64)

Compute pairwise interactions between agents within the given radius.

# Arguments
- `agents`: Vector of agents to process
- `radius`: Interaction radius in world units

# Returns
- `Vector{Interaction}`: List of computed interactions
"""
function compute_agent_interactions(
    agents::Vector{Agent},
    radius::Float64
)::Vector{Interaction}
    interactions = Interaction[]
    # ... implementation
    return interactions
end

# ❌ Bad: Unclear names, untyped, no docs
function ci(a, r)
    i = []
    # ... implementation
    return i
end
```

### Python

```python
# ✅ Good: Type hints, docstrings, PEP 8
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class ModelConfig:
    """Configuration for LLM model inference."""
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 1000

async def generate_response(
    prompt: str,
    config: Optional[ModelConfig] = None
) -> str:
    """
    Generate a response from the language model.
    
    Args:
        prompt: Input prompt text
        config: Model configuration (uses defaults if None)
        
    Returns:
        Generated response text
        
    Raises:
        ModelError: If model inference fails
    """
    config = config or ModelConfig(model_name="default")
    # ... implementation
    return response

# ❌ Bad: No types, no docs, unclear
def gen(p, c=None):
    c = c or {}
    # ... implementation
    return r
```

## Test Policy

### Testing Requirements

1. **All new features**: Must include tests
2. **Bug fixes**: Must include regression tests
3. **Refactoring**: Tests must continue to pass
4. **Coverage target**: Aim for >80% coverage

### Test Structure

#### Unit Tests

Test individual functions/classes in isolation:

```javascript
// JavaScript/TypeScript - Vitest
import { describe, it, expect } from 'vitest';
import { AgentManager } from './AgentManager';

describe('AgentManager', () => {
  it('should add agents and return unique IDs', async () => {
    const manager = new AgentManager();
    const agent = { position: [0, 0], velocity: [1, 0] };
    
    const id1 = await manager.addAgent(agent);
    const id2 = await manager.addAgent(agent);
    
    expect(id1).not.toBe(id2);
    expect(manager.getAgent(id1)).toBeDefined();
  });
});
```

```cpp
// C++ - Qt Test
class TestPerformanceMonitor : public QObject {
  Q_OBJECT
  
private slots:
  void testMetricsCollection() {
    PerformanceMonitor monitor;
    QSignalSpy spy(&monitor, &PerformanceMonitor::metricsUpdated);
    
    monitor.updateMetrics(0.016); // 60 FPS frame
    
    QCOMPARE(spy.count(), 1);
    auto metrics = spy.at(0).at(0).value<PerformanceMetrics>();
    QVERIFY(metrics.frameTime > 0);
  }
};
```

```julia
# Julia - Test.jl
using Test

@testset "Agent Interactions" begin
    agents = [
        Agent(position=[0.0, 0.0]),
        Agent(position=[1.0, 0.0])
    ]
    
    interactions = compute_agent_interactions(agents, 2.0)
    
    @test length(interactions) == 1
    @test interactions[1].distance ≈ 1.0
end
```

#### Integration Tests

Test component interactions:

```javascript
describe('Engine-Frontend Integration', () => {
  it('should synchronize agent state between engine and renderer', async () => {
    const engine = new Engine();
    const renderer = new AgentRenderer();
    
    await engine.addAgent({ id: '1', position: [0, 0] });
    await renderer.syncWithEngine(engine);
    
    expect(renderer.getAgentCount()).toBe(1);
    expect(renderer.getAgent('1').position).toEqual([0, 0]);
  });
});
```

#### End-to-End Tests

Test complete workflows (use sparingly, focus on critical paths):

```javascript
describe('Simulation Lifecycle', () => {
  it('should initialize, run, and teardown cleanly', async () => {
    const app = await createTestApp();
    
    await app.initialize();
    await app.loadScenario('basic');
    await app.run(100); // 100 steps
    const metrics = await app.getMetrics();
    await app.teardown();
    
    expect(metrics.stepsCompleted).toBe(100);
    expect(metrics.errors).toHaveLength(0);
  });
});
```

### Test Naming

- **Descriptive**: Clearly state what is being tested
- **Structure**: `should [expected behavior] when [condition]`
- **Examples**:
  - ✅ `should throw error when agent ID is invalid`
  - ✅ `should update position when velocity is non-zero`
  - ❌ `test1`, `agentTest`, `it works`

### Test Organization

```
tests/
├── unit/              # Unit tests (fast, isolated)
│   ├── agents/
│   ├── engine/
│   └── utils/
├── integration/       # Integration tests (moderate speed)
│   ├── engine-frontend/
│   └── service-coordination/
└── e2e/              # End-to-end tests (slow, comprehensive)
    └── simulation-lifecycle/
```

## Documentation Standards

### Code Documentation

#### JavaScript/TypeScript - JSDoc

```javascript
/**
 * Simulate one step of the agent-based model
 * 
 * @param deltaTime - Time step in seconds
 * @param options - Simulation options
 * @param options.enablePhysics - Whether to apply physics
 * @param options.maxAgents - Maximum number of agents to update
 * @returns Simulation metrics for this step
 * @throws {SimulationError} If simulation state is invalid
 * 
 * @example
 * const metrics = await engine.step(0.016, {
 *   enablePhysics: true,
 *   maxAgents: 1000
 * });
 */
async step(
  deltaTime: number,
  options: StepOptions = {}
): Promise<StepMetrics>
```

#### C++ - Doxygen

```cpp
/**
 * @brief Process queued engine commands
 * 
 * Processes all pending commands from the command queue and applies
 * them to the engine state. Commands are processed in FIFO order.
 * 
 * @param maxCommands Maximum number of commands to process (0 = all)
 * @return Number of commands processed
 * 
 * @note This method is thread-safe
 * @warning Commands may modify engine state
 * 
 * @see QueueCommand, ClearCommandQueue
 */
int processCommands(int maxCommands = 0);
```

#### Julia - Docstrings

```julia
"""
    run_simulation(world::World, steps::Int; parallel::Bool=true)

Run the agent-based simulation for the specified number of steps.

# Arguments
- `world::World`: The world state to simulate
- `steps::Int`: Number of simulation steps to execute
- `parallel::Bool=true`: Use parallel processing if available

# Returns
- `SimulationResult`: Results including final state and metrics

# Examples
```julia
world = create_world(1000)  # 1000 agents
result = run_simulation(world, 100, parallel=true)
println("Final agent count: ", length(result.agents))
```

# See Also
- `create_world`: Initialize world state
- `SimulationResult`: Result structure documentation
"""
```

### Architecture Documentation

Document design decisions and patterns:

```markdown
## Agent Update Pipeline

### Overview
Agents are updated in parallel batches to maximize throughput while
maintaining deterministic behavior.

### Architecture
┌─────────────┐
│   Agents    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Batch     │  Partition into fixed-size batches
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Parallel   │  Process batches in parallel
│  Workers    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Merge     │  Merge results deterministically
└─────────────┘

### Key Design Decisions

1. **Batch Size**: Fixed at 256 agents per batch
   - Rationale: Balances parallelism and memory locality
   - Trade-off: Too large = poor load balancing; too small = overhead

2. **Determinism**: Results are order-independent
   - Implementation: Commutative merge operations
   - Benefit: Reproducible results for debugging

### Performance Characteristics
- O(n/p) time complexity (n=agents, p=processors)
- Memory: O(n + b*p) (b=batch size)
- Scales linearly up to ~16 cores
```

## Integration Protocols

### Service Communication

#### HTTP APIs

```javascript
// ✅ Use consistent endpoint patterns
GET    /api/v1/agents           # List agents
GET    /api/v1/agents/:id       # Get agent
POST   /api/v1/agents           # Create agent
PUT    /api/v1/agents/:id       # Update agent
DELETE /api/v1/agents/:id       # Delete agent

// ✅ Use proper status codes
200 OK                          # Success
201 Created                     # Resource created
400 Bad Request                 # Invalid input
404 Not Found                   # Resource not found
500 Internal Server Error       # Server error

// ✅ Consistent response format
{
  "status": "success",
  "data": { /* result */ },
  "meta": { "timestamp": "2025-10-17T12:00:00Z" }
}
```

#### WebSocket Events

```javascript
// ✅ Namespaced events
socket.on('agent:created', handleAgentCreated);
socket.on('agent:updated', handleAgentUpdated);
socket.on('simulation:started', handleSimulationStarted);

// ✅ Structured payloads
{
  "event": "agent:updated",
  "data": {
    "id": "agent-123",
    "changes": { "position": [1.5, 2.3] }
  },
  "timestamp": 1697548800000
}
```

### Inter-Service Protocols

```javascript
// ✅ Service discovery pattern
class ServiceRegistry {
  async discoverService(name: string): Promise<ServiceEndpoint> {
    const endpoint = await this.registry.lookup(name);
    return endpoint;
  }
}

// ✅ Health checks
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ✅ Graceful shutdown
process.on('SIGTERM', async () => {
  await server.close();
  await database.disconnect();
  process.exit(0);
});
```

## Common Patterns

### Error Handling

```javascript
// ✅ Specific error types
class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
    this.agentId = agentId;
  }
}

// ✅ Proper error propagation
async function getAgent(id: string): Promise<Agent> {
  const agent = await db.agents.findById(id);
  if (!agent) {
    throw new AgentNotFoundError(id);
  }
  return agent;
}

// ✅ Error handling at boundaries
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    res.json({ status: 'success', data: agent });
  } catch (error) {
    if (error instanceof AgentNotFoundError) {
      res.status(404).json({ status: 'error', message: error.message });
    } else {
      res.status(500).json({ status: 'error', message: 'Internal error' });
    }
  }
});
```

### Resource Management

```cpp
// ✅ RAII pattern in C++
class ResourceHandle {
public:
  ResourceHandle() : m_resource(acquireResource()) {}
  ~ResourceHandle() { releaseResource(m_resource); }
  
  // Delete copy, allow move
  ResourceHandle(const ResourceHandle&) = delete;
  ResourceHandle& operator=(const ResourceHandle&) = delete;
  ResourceHandle(ResourceHandle&&) = default;
  ResourceHandle& operator=(ResourceHandle&&) = default;
  
private:
  Resource m_resource;
};
```

### Configuration Management

```javascript
// ✅ Environment-based config
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    logLevel: 'debug'
  },
  production: {
    apiUrl: process.env.API_URL,
    logLevel: 'info'
  }
}[process.env.NODE_ENV || 'development'];
```

## Anti-Patterns to Avoid

### ❌ Global Mutable State

```javascript
// ❌ Bad
let globalAgents = [];

function addAgent(agent) {
  globalAgents.push(agent);
}

// ✅ Good
class AgentRegistry {
  private agents: Agent[] = [];
  
  addAgent(agent: Agent): void {
    this.agents.push(agent);
  }
}
```

### ❌ God Objects

```javascript
// ❌ Bad: Single class doing everything
class Simulation {
  initializeAgents() { }
  updatePhysics() { }
  renderGraphics() { }
  handleInput() { }
  saveToDatabase() { }
  sendNetworkUpdates() { }
  // ... 50 more methods
}

// ✅ Good: Separation of concerns
class SimulationEngine {
  constructor(
    private agents: AgentManager,
    private physics: PhysicsSystem,
    private renderer: Renderer
  ) {}
  
  update(deltaTime: number): void {
    this.physics.update(deltaTime);
    this.agents.update(deltaTime);
    this.renderer.render();
  }
}
```

### ❌ Tight Coupling

```javascript
// ❌ Bad: Direct dependencies
class AgentRenderer {
  render() {
    const agents = database.query('SELECT * FROM agents');
    // render agents...
  }
}

// ✅ Good: Dependency injection
class AgentRenderer {
  constructor(private agentSource: AgentSource) {}
  
  render() {
    const agents = this.agentSource.getAgents();
    // render agents...
  }
}
```

### ❌ Magic Numbers

```javascript
// ❌ Bad
if (velocity > 10.5) {
  // what does 10.5 mean?
}

// ✅ Good
const MAX_VELOCITY = 10.5; // meters per second

if (velocity > MAX_VELOCITY) {
  // clear meaning
}
```

### ❌ Premature Optimization

```javascript
// ❌ Bad: Optimizing before measuring
function processAgents(agents) {
  // Complex bit-manipulation optimization that's hard to read
  // and only saves 0.1ms on 1M agents
}

// ✅ Good: Clear code first, optimize bottlenecks
function processAgents(agents) {
  // Clear, readable implementation
  // Optimize only if profiling shows this is a bottleneck
}
```

## Summary Checklist

Before submitting code as an AI agent:

- [ ] Code follows language-specific conventions
- [ ] Module boundaries respected
- [ ] Tests added (unit + integration where needed)
- [ ] Documentation complete (code comments + architecture docs)
- [ ] Error handling implemented
- [ ] No anti-patterns present
- [ ] Integration protocols followed
- [ ] Performance considered (not prematurely optimized)
- [ ] Code reviewed (self-review or automated checks)

## References

- [CONTRIBUTING.md](CONTRIBUTING.md) - General contribution guidelines
- [qt-gui/CODING_STANDARDS.md](qt-gui/CODING_STANDARDS.md) - Qt-specific standards
- [DOCS_INDEX.md](DOCS_INDEX.md) - Documentation index
- [qt-gui/START_HERE.md](qt-gui/START_HERE.md) - Qt GUI getting started

---

**Remember**: Good code is code that humans (and other AI agents) can understand, maintain, and extend. Write for clarity first, optimization second.
