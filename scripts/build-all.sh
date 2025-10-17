#!/usr/bin/env bash
# Build all EcoSysX components
# Usage:
#   ./build-all.sh              # Build everything
#   ./build-all.sh web          # Build web only
#   ./build-all.sh gui          # Build Qt GUI only
#   ./build-all.sh services     # Build services only

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPONENT="${1:-all}"
CONFIGURATION="${2:-dev}"

echo "=== EcoSysX Build All ==="
echo "Component: $COMPONENT"
echo "Configuration: $CONFIGURATION"
echo ""

build_engine() {
    echo "[1/4] Building genx-engine..."
    cd "$REPO_ROOT/packages/genx-engine"
    npm ci
    npm run build
    echo "✓ genx-engine built successfully"
}

build_web() {
    echo "[2/4] Building web application..."
    cd "$REPO_ROOT"
    npm ci
    npm run build
    echo "✓ Web application built successfully"
}

build_gui() {
    echo "[3/4] Building Qt GUI application..."
    cd "$REPO_ROOT/qt-gui"
    ./scripts/build.sh "${CONFIGURATION}"
    echo "✓ Qt GUI built successfully"
}

build_services() {
    echo "[4/4] Building service sidecars..."
    
    # Engine sidecar (Node.js)
    echo "  Building engine-sidecar..."
    cd "$REPO_ROOT/services/engine-sidecar"
    npm ci
    echo "  ✓ engine-sidecar ready"
    
    # Agents sidecar (Julia)
    echo "  Verifying agents-sidecar..."
    if [ -f "$REPO_ROOT/services/agents-sidecar/Project.toml" ]; then
        echo "  ✓ agents-sidecar ready (Julia project)"
    else
        echo "  ⚠ agents-sidecar missing Project.toml"
    fi
    
    echo "✓ Services ready"
}

# Execute builds
case "${COMPONENT}" in
    engine)
        build_engine
        ;;
    web)
        build_web
        ;;
    gui)
        build_gui
        ;;
    services)
        build_services
        ;;
    all)
        build_engine
        build_web
        build_gui
        build_services
        ;;
    *)
        echo "Error: Unknown component: $COMPONENT"
        echo "Valid components: all, engine, web, gui, services"
        exit 1
        ;;
esac

echo ""
echo "=== Build Complete ==="
echo "All requested components built successfully."
