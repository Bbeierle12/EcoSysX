# EcoSysX Test Suite

This document provides a comprehensive guide to testing in EcoSysX across all project components.

## Overview

EcoSysX uses multiple testing frameworks appropriate for each technology stack:

- **Vitest**: JavaScript/TypeScript testing (React frontend, GenX engine)
- **Qt Test**: C++ testing (Qt GUI application)
- **Julia Test**: Julia service testing (Agents sidecar)
- **pytest**: Python service testing (Mesa sidecar, LLM service)
- **JUnit**: Java service testing (MASON sidecar)

## Quick Start

### Run All JavaScript/TypeScript Tests

```bash
npm test
```

### Run Qt C++ Tests

```bash
cd qt-gui/build
ctest --output-on-failure
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## JavaScript/TypeScript Testing (Vitest)

### Configuration

Tests are configured in `vitest.config.js`:

```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './test/setup.js',
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'packages/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run specific test file
npm test src/core/AgentClasses.test.js

# Run tests matching pattern
npm test -- --grep="Message System"

# Run with coverage
npm run test:coverage
```

### Writing Tests

Place test files next to the code they test with `.test.js`, `.test.jsx`, `.test.ts`, or `.test.tsx` extension:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyClass } from './MyClass.js';

describe('MyClass', () => {
  let instance;

  beforeEach(() => {
    instance = new MyClass();
  });

  it('should create instance', () => {
    expect(instance).toBeDefined();
  });

  it('should perform action', () => {
    const result = instance.doSomething();
    expect(result).toBe('expected');
  });
});
```

### Test Structure

```
src/
├── core/
│   ├── AgentClasses.js
│   ├── AgentClasses.test.js
│   ├── EcosystemEngine.js
│   └── EcosystemEngine.test.js
└── ui/
    ├── Dashboard.jsx
    └── Dashboard.test.jsx

packages/
└── genx-engine/
    └── src/
        ├── engine.ts
        └── engine.test.ts
```

## C++ Testing (Qt Test)

### Configuration

Qt tests are configured in `qt-gui/tests/CMakeLists.txt`. Each test is a separate executable.

### Running Tests

```bash
# Build and run all tests
cd qt-gui/build
cmake --build . --target all
ctest --output-on-failure

# Run specific test
./bin/tst_configuration

# Run with verbose output
ctest -V

# Run tests in parallel
ctest -j4
```

### Writing Tests

Create test files in `qt-gui/tests/unit/`:

```cpp
#include <QtTest/QtTest>
#include "../../src/core/Configuration.h"

class TestConfiguration : public QObject {
    Q_OBJECT
    
private slots:
    void testDefaults() {
        Configuration config;
        QCOMPARE(config.simulation.maxSteps, 10000);
        QCOMPARE(config.simulation.worldSize, 100.0);
    }
    
    void testValidation() {
        Configuration config;
        QStringList errors;
        QVERIFY(config.validate(&errors));
        QVERIFY(errors.isEmpty());
    }
};

QTEST_MAIN(TestConfiguration)
#include "tst_configuration.moc"
```

### Test Structure

```
qt-gui/
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── tst_configuration.cpp
│   │   ├── tst_engineclient.cpp
│   │   └── tst_validation_utils.cpp
│   ├── integration/
│   │   └── tst_engine_integration.cpp
│   └── fixtures/
│       └── test-config.json
└── src/
    └── core/
        └── Configuration.{h,cpp}
```

## Test Coverage

### JavaScript/TypeScript Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

Coverage reports are generated in the `coverage/` directory.

### C++ Coverage

Enable coverage in CMake:

```bash
cd qt-gui/build
cmake .. -DENABLE_COVERAGE=ON
cmake --build .
ctest
# Generate coverage report (requires lcov/gcov)
```

## Continuous Integration

Tests run automatically on push/PR via GitHub Actions (see `.github/workflows/`).

### CI Test Commands

```yaml
# JavaScript/TypeScript
- run: npm ci
- run: npm run test:run

# Qt C++
- run: cd qt-gui/build && cmake .. && cmake --build .
- run: cd qt-gui/build && ctest --output-on-failure
```

## Testing Best Practices

### General Principles

1. **Test behavior, not implementation**: Focus on what the code does, not how
2. **One assertion per concept**: Tests should verify a single behavior
3. **Descriptive names**: Test names should describe what they verify
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Independent tests**: Tests should not depend on each other

### JavaScript/TypeScript

```javascript
// ✅ Good
describe('ReinforcementLearningPolicy', () => {
  it('should calculate positive reward for high energy', () => {
    const policy = new ReinforcementLearningPolicy();
    const observation = { energy: 100, nearbyInfected: 0 };
    
    const reward = policy.calculateReward(observation);
    
    expect(reward).toBeGreaterThan(0);
  });
});

// ❌ Bad
describe('Policy', () => {
  it('works', () => {
    const p = new ReinforcementLearningPolicy();
    expect(p.calculateReward({ energy: 100, nearbyInfected: 0 })).toBeGreaterThan(0);
  });
});
```

### C++

```cpp
// ✅ Good
void TestConfiguration::testJsonRoundTrip() {
    Configuration original;
    original.simulation.maxSteps = 5000;
    
    QJsonObject json = original.toJson();
    Configuration restored;
    restored.fromJson(json);
    
    QCOMPARE(restored.simulation.maxSteps, 5000);
}

// ❌ Bad
void TestConfiguration::test1() {
    Configuration c;
    c.simulation.maxSteps = 5000;
    QCOMPARE(c.toJson()["simulation"].toObject()["maxSteps"].toInt(), 5000);
}
```

## Mocking and Stubbing

### Vitest Mocks

```javascript
import { vi } from 'vitest';

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);

// Mock module
vi.mock('./LLMService.js', () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue('response')
  }))
}));

// Spy on method
const spy = vi.spyOn(object, 'method');
```

### Qt Test Mocks

```cpp
// Mock with QSignalSpy
QSignalSpy spy(object, &Object::signalName);
object->doSomething();
QCOMPARE(spy.count(), 1);

// Verify signal arguments
QList<QVariant> arguments = spy.takeFirst();
QCOMPARE(arguments.at(0).toInt(), expectedValue);
```

## Debugging Tests

### JavaScript/TypeScript

```bash
# Run single test file
npm test src/core/AgentClasses.test.js

# Debug in VS Code
# Add breakpoint and use "Debug Test" in test file

# Verbose output
npm test -- --reporter=verbose
```

### C++

```bash
# Run single test
cd qt-gui/build/bin
./tst_configuration

# Debug in VS Code or Qt Creator
# Set breakpoints and run test executable
```

## Test Data and Fixtures

### JavaScript/TypeScript

```javascript
// test/fixtures/sample-config.json
{
  "simulation": { "maxSteps": 1000 },
  "agents": { "initialPopulation": 100 }
}

// In test
import sampleConfig from '../fixtures/sample-config.json';
```

### C++

```cpp
// tests/fixtures/test-config.json
// In test
const QString fixturePath = QFINDTESTDATA("fixtures/test-config.json");
QFile file(fixturePath);
```

## Performance Testing

### JavaScript/TypeScript

```javascript
import { describe, it, expect } from 'vitest';

describe('Performance', () => {
  it('should process 1000 agents in under 100ms', () => {
    const engine = new EcosystemEngine();
    const start = performance.now();
    
    engine.processAgents(createAgents(1000));
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

### C++

```cpp
void TestPerformance::testAgentProcessing() {
    QElapsedTimer timer;
    timer.start();
    
    // Run operation
    engine.processAgents(1000);
    
    qint64 elapsed = timer.elapsed();
    QVERIFY(elapsed < 100); // Less than 100ms
}
```

## Troubleshooting

### Common Issues

**Tests not found**: Ensure test files match the include pattern in config
**Module not found**: Check import paths and file extensions
**Timeout errors**: Increase timeout for slow tests
**Flaky tests**: Use `vi.useFakeTimers()` for time-dependent tests

### Getting Help

- Check existing tests for examples
- Consult AGENTS.md for coding conventions
- See TESTING_PLAN.md for detailed testing strategy

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Qt Test Documentation](https://doc.qt.io/qt-6/qtest-overview.html)
- [AGENTS.md](../AGENTS.md) - AI Agent coding conventions
- [TESTING_PLAN.md](../TESTING_PLAN.md) - Overall testing strategy
