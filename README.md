# EcoSysX - Multi-Agent Ecosystem Simulator

A comprehensive React-based ecosystem simulation featuring intelligent agents, reinforcement learning, and complex social dynamics.

## 🌟 Features

### Core Simulation
- **Multi-Agent System**: 25+ autonomous agents with different AI approaches
- **SIR Disease Model**: Susceptible-Infected-Recovered epidemic simulation
- **Dynamic Environment**: Seasonal changes, weather systems, and resource regeneration
- **Real-time 3D Visualization**: Interactive Three.js-powered 3D environment
- **Player Interaction**: Control your own agent in the ecosystem

### AI & Intelligence
- **Reinforcement Learning**: Q-learning agents that adapt their behavior
- **Causal Reasoning**: Advanced AI agents with chain-of-thought decision making
- **Social Memory**: Trust-based communication and information sharing
- **Genetic Algorithms**: Evolutionary traits and reproduction mechanics
- **Hybrid Intelligence**: Combination of RL and causal reasoning approaches

### Interactive Elements
- **Real-time Controls**: Play/pause, reset, camera modes
- **Live Statistics**: Population dynamics, disease spread tracking
- **Agent Inspection**: Double-click agents to see their reasoning process
- **Scientific Dashboard**: Comprehensive data visualization with D3.js

## 🎮 How to Play

1. **Your Agent**: The white agent is yours! Click anywhere to move it
2. **Survival**: Collect green resource cubes to maintain energy
3. **Avoid Infection**: Stay away from red infected agents
4. **Watch AI**: Gold agents use advanced reasoning, blue agents use reinforcement learning
5. **Observe Evolution**: Watch the population dynamics and AI behavior over time

### Controls
- **Left Click**: Move your agent
- **Right Drag**: Rotate camera
- **Mouse Wheel**: Zoom in/out
- **Double Click Agent**: View AI reasoning details

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Architecture

### Agent Types
- **PlayerAgent**: Human-controlled white agent
- **Agent**: Basic RL agents (blue) using Q-learning
- **CausalAgent**: Advanced AI agents (gold) with reasoning capabilities

### Key Systems
- **ReinforcementLearningPolicy**: Q-learning with epsilon-greedy exploration
- **SocialMemory**: Trust-based information sharing between agents
- **Environment**: Dynamic ecosystem with seasonal cycles
- **Message System**: Agent-to-agent communication for resource sharing and warnings

### Technologies
- **React 19** + **Vite** for modern development
- **Three.js** for 3D graphics and physics simulation
- **D3.js** for real-time data visualization
- **Tailwind CSS** for responsive UI design

## 📊 Scientific Features

### Disease Modeling
- SIR (Susceptible-Infected-Recovered) epidemiological model
- Infection probability based on proximity and resistance
- Recovery mechanics with immunity

### Population Dynamics
- Genetic algorithm-based reproduction
- Energy-based survival mechanics
- Population pressure and carrying capacity
- Age-based mortality

### AI Research
- Multi-agent reinforcement learning (MARL)
- Chain-of-thought reasoning simulation
- Social trust networks
- Information verification and accuracy tracking

## 🎯 Simulation Parameters

- **Population Size**: 25+ agents (dynamic)
- **Environment**: 40x40 unit bounded space
- **Simulation Speed**: ~10 steps per second
- **Energy System**: 0-100% with consumption/regeneration
- **Infection Rate**: 2-3% per step when exposed
- **Recovery Time**: ~40 simulation steps

## 🔬 Research Applications

This simulator demonstrates:
- **Emergent Behavior**: Complex patterns from simple rules
- **Social Information Networks**: How trust affects information sharing
- **Epidemic Modeling**: Disease spread in mobile populations
- **AI Decision Making**: Comparison of RL vs reasoning-based approaches
- **Ecosystem Dynamics**: Resource competition and survival strategies

## 📈 Monitoring & Analytics

The dashboard provides real-time insights into:
- Population demographics (Susceptible/Infected/Recovered)
- Agent intelligence metrics
- Environmental conditions
- Communication patterns
- Evolutionary trends

## 🤝 Contributing

This is a research and educational project. Feel free to:
- Experiment with different AI approaches
- Add new agent behaviors
- Modify environmental parameters
- Extend the communication system

## 📝 License

Open source project for educational and research purposes.

---

**Built with ❤️ for AI research and complex systems exploration**+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
