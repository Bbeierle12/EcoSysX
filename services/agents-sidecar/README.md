# Genesis Engine Agents.jl Sidecar

JSON-RPC sidecar service for running Agents.jl ecosystem simulations.

## Dependencies

- Julia 1.6+
- Agents.jl 5.0+
- JSON3.jl for serialization
- SHA.jl for deterministic hashing

## Usage

```bash
julia main.jl
```

Communicates via JSON-RPC over stdin/stdout with the Genesis Engine.

## Docker Build

```bash
docker build -t genx-agents-sidecar .
```