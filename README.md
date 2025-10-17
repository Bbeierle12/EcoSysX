---
title: GenesisX - Ecosystem Simulator
emoji: 🌱
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# GenesisX - Advanced Ecosystem Simulator

An AI-powered ecosystem simulation featuring autonomous agents with large language model reasoning capabilities.

## Features

- **TIME_V1 System**: Biologically accurate time progression (1 hour per step)
- **CausalAgents**: LLM-powered autonomous agents with reasoning capabilities
- **Observer Analytics**: Real-time epidemiology tracking and mass balance validation
- **High-Performance**: Optimized for GPU-accelerated environments

## Hardware Requirements

This simulation is designed to run on high-performance hardware:
- **GPUs**: 4x L40S (recommended)
- **RAM**: 382GB (recommended for large-scale simulations)
- **CPU**: Multi-core for parallel agent processing

## Usage

The simulator runs in observer mode with controls for:
- Following highest energy agents
- Tracking oldest agents
- Random agent selection
- Ecosystem overview mode

## Repository Structure

This is a monorepo containing multiple applications and services:

### 📦 **Packages** (`packages/`)
Shared libraries and core simulation engine:
- **`genx-engine/`** - Core TypeScript/JavaScript simulation engine
  - Agent behavior primitives
  - World state management
  - Framework-agnostic APIs

### 🌐 **Web Application** (`src/`, root)
React-based web interface:
- **Framework**: React 19 + Vite
- **Rendering**: Three.js for 3D visualization, D3.js for analytics
- **Styling**: Tailwind CSS
- **Entry**: `src/main.jsx`, built by `vite.config.js`

### 🖥️ **Qt GUI Application** (`qt-gui/`)
Native desktop application for high-performance interaction:
- **Framework**: Qt 6.9.3 (Widgets, Core)
- **Language**: C++17
- **Build System**: CMake with presets
- **Features**: Real-time monitoring, direct engine integration

### 🔧 **Services** (`services/`)
Backend sidecars for specialized computation:
- **`agents-sidecar/`** (Julia) - High-performance agent computation
- **`engine-sidecar/`** (Node.js) - Service adapter layer
- **`llama-service/`** (Python/Node.js) - LLM integration for agent intelligence
- **`mason-sidecar/`** - MASON ABM framework bridge
- **`mesa-sidecar/`** (Python) - Mesa ABM framework bridge

### 📜 **Scripts** (`scripts/`)
Cross-repository automation and utilities:
- `generate-golden-log.mjs` - Baseline test data generation

See [DOCS_INDEX.md](DOCS_INDEX.md) for comprehensive documentation.

## Technology Stack

- React 19 + Vite
- Three.js for 3D visualization
- D3.js for data visualization
- Tailwind CSS for styling
- Ollama integration for LLM reasoning
- Qt 6.9.3 for native desktop UI
- Julia 1.12+ for scientific computing
- CMake 3.23+ with presets

## Development

Built with comprehensive biological modeling including:
- Contact-hours epidemiology
- Mass balance conservation
- Continuous-time hazard functions
- Compressed schema export (v1)

### Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions for all components.

---

*Powered by advanced AI reasoning for realistic ecosystem dynamics*