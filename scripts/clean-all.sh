#!/usr/bin/env bash
# Clean all EcoSysX build artifacts
# Usage:
#   ./clean-all.sh              # Clean everything
#   ./clean-all.sh web          # Clean web only
#   ./clean-all.sh --keep-deps  # Keep node_modules

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPONENT="${1:-all}"
KEEP_DEPS=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --keep-deps)
            KEEP_DEPS=true
            ;;
        *)
            COMPONENT="$arg"
            ;;
    esac
done

echo "=== EcoSysX Clean All ==="
echo "Component: $COMPONENT"
echo "Keep Dependencies: $KEEP_DEPS"
echo ""

remove_if_exists() {
    if [ -d "$1" ] || [ -f "$1" ]; then
        echo "  Removing: $1"
        rm -rf "$1"
    fi
}

clean_engine() {
    echo "[1/4] Cleaning genx-engine..."
    cd "$REPO_ROOT/packages/genx-engine"
    remove_if_exists "dist"
    remove_if_exists "coverage"
    remove_if_exists ".vitest"
    if [ "$KEEP_DEPS" != true ]; then
        remove_if_exists "node_modules"
    fi
    echo "✓ genx-engine cleaned"
}

clean_web() {
    echo "[2/4] Cleaning web application..."
    cd "$REPO_ROOT"
    remove_if_exists "dist"
    remove_if_exists "coverage"
    remove_if_exists ".vitest"
    if [ "$KEEP_DEPS" != true ]; then
        remove_if_exists "node_modules"
    fi
    echo "✓ Web application cleaned"
}

clean_gui() {
    echo "[3/4] Cleaning Qt GUI application..."
    cd "$REPO_ROOT/qt-gui"
    remove_if_exists "build"
    echo "✓ Qt GUI cleaned"
}

clean_services() {
    echo "[4/4] Cleaning service sidecars..."
    
    if [ "$KEEP_DEPS" != true ]; then
        cd "$REPO_ROOT/services/engine-sidecar"
        remove_if_exists "node_modules"
        
        cd "$REPO_ROOT/services/llama-service"
        remove_if_exists "node_modules"
    fi
    
    echo "✓ Services cleaned"
}

# Execute cleaning
case "${COMPONENT}" in
    engine)
        clean_engine
        ;;
    web)
        clean_web
        ;;
    gui)
        clean_gui
        ;;
    services)
        clean_services
        ;;
    all)
        clean_engine
        clean_web
        clean_gui
        clean_services
        ;;
    *)
        echo "Error: Unknown component: $COMPONENT"
        echo "Valid components: all, engine, web, gui, services"
        exit 1
        ;;
esac

echo ""
echo "=== Clean Complete ==="
