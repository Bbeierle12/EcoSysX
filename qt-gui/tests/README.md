# EcoSysX Qt GUI Tests

## Test Structure

This directory contains the test suite for the EcoSysX Qt GUI application.

### Test Categories

#### Unit Tests (`unit/`)
- Test individual classes and functions in isolation
- Fast execution, no external dependencies
- Use mocks for dependencies

#### Integration Tests (`integration/`)
- Test interaction between multiple components
- May involve actual IPC with sidecar (mocked or real)
- Test complete workflows

#### Fixtures (`fixtures/`)
- Sample JSON configuration files
- Mock snapshot data
- Test response payloads

## Running Tests

```bash
# From build directory
cd build

# Run all tests
ctest --output-on-failure

# Run specific test
ctest -R test_EngineClient --verbose

# Run with valgrind (Linux/macOS)
ctest -T memcheck
```

## Writing Tests

### Using Qt Test Framework

```cpp
#include <QtTest/QtTest>

class TestExample : public QObject {
    Q_OBJECT

private slots:
    void initTestCase();        // Run once before all tests
    void init();                // Run before each test
    void testSomething();       // Test function
    void cleanup();             // Run after each test
    void cleanupTestCase();     // Run once after all tests
};

void TestExample::testSomething() {
    QCOMPARE(1 + 1, 2);
    QVERIFY(true);
}

QTEST_MAIN(TestExample)
#include "test_example.moc"
```

## Test Coverage

Target: >80% coverage for business logic

Tools:
- gcov/lcov (GCC)
- llvm-cov (Clang)
- Visual Studio Code Coverage (MSVC)

## Test Fixtures

Place sample data files in `fixtures/`:
- `sample_config.json` - Valid configuration
- `invalid_config.json` - Invalid configuration for error testing
- `sample_snapshot.json` - Sample snapshot data
- `mock_responses/` - Directory with various mock sidecar responses
