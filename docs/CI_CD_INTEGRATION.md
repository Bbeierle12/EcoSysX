# CI/CD Integration Documentation

## Genesis Engine CI/CD Pipeline

This document describes the comprehensive CI/CD pipeline implemented for the Genesis Engine multi-provider simulation platform.

### Pipeline Overview

The CI/CD pipeline (`/.github/workflows/provider-integration.yml`) provides automated building, testing, and deployment for all Genesis Engine providers:

- **Mesa Provider** (Python/Mesa framework)
- **Agents.jl Provider** (Julia/Agents.jl framework)  
- **MASON Provider** (Java/MASON framework)

### Pipeline Stages

#### 1. SDK Build & Test
- **TypeScript compilation** with strict type checking
- **Unit testing** with Vitest and coverage reporting
- **Linting** with ESLint for code quality
- **Artifact packaging** for downstream stages

#### 2. Sidecar Container Builds
- **Multi-architecture Docker builds** (linux/amd64)
- **Provider-specific optimization** for each framework
- **Docker layer caching** for faster subsequent builds
- **Container registry publishing** to GitHub Container Registry

#### 3. Security Scanning
- **Trivy vulnerability scanning** for all container images
- **SARIF report generation** for GitHub Security tab
- **Critical/High severity blocking** for production deployments

#### 4. Integration Testing
- **Provider initialization** validation
- **Step execution** consistency checks
- **Agent conservation** testing (population stability)
- **Disease progression** modeling verification
- **Provider restart** resilience testing
- **TIME_V1 compliance** validation

#### 5. Determinism Validation
- **Identical run reproduction** with same seeds
- **Cross-seed differentiation** verification
- **Hash consistency** across simulation steps
- **Step-restart determinism** preservation

#### 6. Performance Benchmarking
- **Throughput measurement** (steps/second, agent-steps/second)
- **Memory usage** profiling
- **Step time distribution** analysis (P50, P95, P99)
- **Cross-provider comparison** metrics

### Test Matrix

The pipeline tests each provider across multiple dimensions:

```yaml
Provider Matrix:
  - mesa (Python)
  - agents (Julia) 
  - mason (Java)

Population Matrix:
  - 100 agents
  - 500 agents
  - 1000 agents

Test Types:
  - Integration tests
  - Determinism tests  
  - Performance benchmarks
```

### Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROVIDER_IMAGE` | Docker image for testing | `genx-test-sidecar:latest` |
| `TEST_TIMEOUT` | Test timeout (ms) | `300000` |
| `POPULATION_SIZE` | Benchmark population | `100` |

#### Trigger Events

- **Push to main/develop** - Full pipeline execution
- **Pull requests** - Integration and determinism tests only
- **Manual dispatch** - Full pipeline with custom parameters

### Artifacts

#### Build Artifacts
- `sdk-dist` - Compiled TypeScript SDK
- `coverage-report` - Test coverage HTML reports
- `{provider}-sidecar-image` - Docker container tars

#### Test Artifacts  
- `{provider}-test-failure` - Failure logs and debugging info
- `benchmark-{provider}-{population}` - Performance results JSON

#### Security Artifacts
- `trivy-results-{provider}.sarif` - Vulnerability scan reports

### Performance Baselines

Current performance targets per provider:

| Metric | Mesa | Agents.jl | MASON |
|--------|------|-----------|-------|
| Steps/sec | >10 | >15 | >12 |
| Agent-steps/sec | >1000 | >1500 | >1200 |
| Memory (RSS) | <512MB | <256MB | <768MB |
| P95 step time | <500ms | <400ms | <450ms |

### Deployment

#### Container Images

Published to GitHub Container Registry:
- `ghcr.io/{owner}/genx-mesa-sidecar:latest`
- `ghcr.io/{owner}/genx-agents-sidecar:latest`  
- `ghcr.io/{owner}/genx-mason-sidecar:latest`

#### Release Process

1. **Automated tagging** on main branch commits
2. **GitHub Release creation** with changelog
3. **Container image promotion** to latest tags
4. **Documentation publishing** to GitHub Pages

### Quality Gates

#### Required Checks
- ✅ TypeScript compilation successful
- ✅ All unit tests passing (>95% coverage)
- ✅ Integration tests passing for all providers
- ✅ Determinism validation successful
- ✅ No critical/high security vulnerabilities
- ✅ Performance within acceptable thresholds

#### Optional Checks  
- 🔍 Performance benchmarks completed
- 🔍 Cross-provider comparison analysis
- 🔍 Memory usage within limits

### Local Development

#### Running Tests Locally

```bash
# Install dependencies
cd packages/genx-engine
npm install

# Run unit tests
npm run test

# Run integration tests (requires Docker)
npm run test:integration

# Run determinism tests
npm run test:determinism

# Run performance benchmark
PROVIDER=mesa POPULATION_SIZE=100 npm run benchmark
```

#### Docker Development

```bash
# Build sidecar images
docker build -t genx-mesa-sidecar services/mesa-sidecar/
docker build -t genx-agents-sidecar services/agents-sidecar/
docker build -t genx-mason-sidecar services/mason-sidecar/

# Run integration tests with local images
PROVIDER_IMAGE=genx-mesa-sidecar npm run test:integration
```

### Monitoring & Alerts

#### Pipeline Monitoring
- **GitHub Actions dashboard** for build status
- **Slack/Discord notifications** for failures
- **Performance regression detection** in benchmarks

#### Container Monitoring
- **Registry usage tracking** for storage costs
- **Image vulnerability alerts** from Dependabot
- **Download metrics** for adoption tracking

### Troubleshooting

#### Common Issues

**Build Failures:**
- Check Docker daemon status
- Verify network connectivity for package installs
- Review dependency lock files for version conflicts

**Test Failures:**  
- Ensure Docker containers have sufficient resources
- Check provider-specific configuration requirements
- Verify test timeout settings for slow environments

**Determinism Issues:**
- Validate RNG seed consistency across runs
- Check for external dependencies affecting state
- Review floating-point precision in calculations

#### Debug Commands

```bash
# Check container logs
docker logs {container_id}

# Run tests with verbose output  
npm run test -- --reporter=verbose

# Generate detailed coverage report
npm run test:ci

# Profile memory usage
node --inspect scripts/benchmark.ts
```

### Contributing

When adding new providers or tests:

1. **Update test matrix** in workflow file
2. **Add provider-specific configuration** 
3. **Implement determinism validation**
4. **Add performance benchmarks**
5. **Update documentation**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.