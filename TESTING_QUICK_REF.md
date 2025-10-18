# EcoSysX Testing Quick Reference

## 🚀 Quick Commands

```bash
# Run all tests
npm test

# Run in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run with interactive UI
npm run test:ui

# Run once (for CI)
npm run test:run

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test src/core/AgentClasses.test.js

# Run tests matching pattern
npm test -- --grep="Message System"
```

## 📝 Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from './MyClass.js';

describe('MyClass', () => {
  let instance;

  beforeEach(() => {
    instance = new MyClass();
  });

  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = instance.method(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Common Assertions

```javascript
// Equality
expect(value).toBe(42);                    // Strict equality (===)
expect(obj).toEqual({ a: 1 });             // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(num).toBeGreaterThan(5);
expect(num).toBeLessThan(10);
expect(num).toBeWithinRange(0, 100);       // Custom matcher

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/pattern/);

// Arrays
expect(arr).toHaveLength(3);
expect(arr).toContain(item);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ a: 1 });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(() => fn()).toThrow('Error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

### Mocking

```javascript
import { vi } from 'vitest';

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue('async result');

// Spy on method
const spy = vi.spyOn(obj, 'method');
spy.mockImplementation(() => 'mocked');

// Mock module
vi.mock('./module.js', () => ({
  export1: vi.fn(),
  export2: 'mocked value'
}));

// Restore mocks
vi.restoreAllMocks();
```

## 🎯 Test Organization

```
src/
├── core/
│   ├── MyClass.js
│   └── MyClass.test.js          ← Place tests next to code
├── utils/
│   ├── helpers.js
│   └── helpers.test.js
test/
├── setup.js                      ← Global test setup
└── fixtures/                     ← Test data
    └── sample-data.json
```

## ⚡ Best Practices

### ✅ DO

```javascript
// Descriptive test names
it('should calculate reward for high energy agents', () => {});

// One concept per test
it('should validate positive numbers', () => {});
it('should reject negative numbers', () => {});

// Arrange-Act-Assert
it('should process input', () => {
  const input = 'test';              // Arrange
  const result = process(input);     // Act
  expect(result).toBe('processed');  // Assert
});

// Test behavior, not implementation
it('should notify observers when value changes', () => {
  const observer = vi.fn();
  subject.subscribe(observer);
  subject.setValue(10);
  expect(observer).toHaveBeenCalledWith(10);
});
```

### ❌ DON'T

```javascript
// Vague test names
it('test1', () => {});
it('works', () => {});

// Multiple concepts in one test
it('should do everything', () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
  // ... 20 more assertions
});

// Testing implementation details
it('should set internal variable', () => {
  obj.method();
  expect(obj._internalVar).toBe(true);  // ❌ Testing private state
});
```

## 🐛 Debugging Tests

### Run Single Test
```javascript
it.only('should run this test only', () => {
  // Only this test runs
});
```

### Skip Test
```javascript
it.skip('should skip this test', () => {
  // This test is skipped
});
```

### Debug in VS Code
1. Set breakpoint in test file
2. Click "Debug Test" in CodeLens
3. Or use Debug sidebar

### Verbose Output
```bash
npm test -- --reporter=verbose
```

## 📊 Coverage

### View Coverage
```bash
npm run test:coverage

# Open HTML report
open coverage/index.html        # macOS
start coverage/index.html       # Windows
xdg-open coverage/index.html    # Linux
```

### Coverage Goals
- **Unit Tests**: >80% coverage
- **Critical Paths**: 100% coverage
- **New Features**: Must include tests

## 🏗️ Qt C++ Tests

### Run Qt Tests
```bash
cd qt-gui/build
cmake --build . --target all
ctest --output-on-failure
```

### Qt Test Structure
```cpp
#include <QtTest/QtTest>

class TestMyClass : public QObject {
    Q_OBJECT
    
private slots:
    void initTestCase() { }      // Run once before all tests
    void init() { }              // Run before each test
    void cleanup() { }           // Run after each test
    void cleanupTestCase() { }   // Run once after all tests
    
    void testSomething() {
        QCOMPARE(actual, expected);
        QVERIFY(condition);
    }
};

QTEST_MAIN(TestMyClass)
#include "tst_myclass.moc"
```

## 📚 Resources

- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Full guide
- [Vitest Docs](https://vitest.dev/) - Official documentation
- [Qt Test Docs](https://doc.qt.io/qt-6/qtest-overview.html) - Qt testing

## 🆘 Common Issues

### Tests Not Found
- Check file naming: `*.test.js`, `*.test.ts`, `*.test.jsx`, `*.test.tsx`
- Check include pattern in `vitest.config.js`

### Module Import Errors
- Use correct file extensions: `.js`, `.ts`
- Check import paths are relative or absolute

### Timeout Errors
```javascript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Flaky Tests
```javascript
// Use fake timers for time-dependent tests
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

---

**Quick Help**: Run `npm test -- --help` for all Vitest options
