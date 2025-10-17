#!/usr/bin/env bash
# Run all EcoSysX tests
# Usage:
#   ./test-all.sh              # Test everything
#   ./test-all.sh web          # Test web only
#   ./test-all.sh gui          # Test Qt GUI only
#   ./test-all.sh --coverage   # With coverage

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPONENT="${1:-all}"
COVERAGE=false
TESTS_PASSED=0
TESTS_FAILED=0

# Parse arguments
for arg in "$@"; do
    case $arg in
        --coverage)
            COVERAGE=true
            ;;
        *)
            COMPONENT="$arg"
            ;;
    esac
done

echo "=== EcoSysX Test All ==="
echo "Component: $COMPONENT"
echo "Coverage: $COVERAGE"
echo ""

test_engine() {
    echo "[1/4] Testing genx-engine..."
    cd "$REPO_ROOT/packages/genx-engine"
    if [ "$COVERAGE" = true ]; then
        npm test -- --coverage
    else
        npm test
    fi
    echo "✓ genx-engine tests passed"
    ((TESTS_PASSED++))
}

test_web() {
    echo "[2/4] Testing web application..."
    cd "$REPO_ROOT"
    if [ "$COVERAGE" = true ]; then
        npm test -- --coverage
    else
        npm test
    fi
    echo "✓ Web application tests passed"
    ((TESTS_PASSED++))
}

test_gui() {
    echo "[3/4] Testing Qt GUI application..."
    cd "$REPO_ROOT/qt-gui"
    
    # Build if needed
    if [ ! -d "build/bin" ] || [ -z "$(ls -A build/bin)" ]; then
        echo "  Building Qt GUI first..."
        ./scripts/build.sh ci-unix
    fi
    
    # Run tests
    cmake --build build --target test
    echo "✓ Qt GUI tests passed"
    ((TESTS_PASSED++))
}

test_services() {
    echo "[4/4] Testing service sidecars..."
    
    # Engine sidecar tests
    echo "  Testing engine-sidecar..."
    cd "$REPO_ROOT/services/engine-sidecar"
    npm test
    echo "  ✓ engine-sidecar tests passed"
    
    echo "✓ Service tests completed"
    ((TESTS_PASSED++))
}

# Execute tests
case "${COMPONENT}" in
    engine)
        test_engine
        ;;
    web)
        test_web
        ;;
    gui)
        test_gui
        ;;
    services)
        test_services
        ;;
    all)
        test_engine || ((TESTS_FAILED++))
        test_web || ((TESTS_FAILED++))
        test_gui || ((TESTS_FAILED++))
        test_services || ((TESTS_FAILED++))
        ;;
    *)
        echo "Error: Unknown component: $COMPONENT"
        echo "Valid components: all, engine, web, gui, services"
        exit 1
        ;;
esac

echo ""
echo "=== Test Results ==="
echo "Components Passed: $TESTS_PASSED"
echo "Components Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
fi
