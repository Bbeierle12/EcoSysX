#!/bin/bash
# EcoSysX Qt GUI - Build Script for Unix/Linux/macOS
# Now using CMake Presets for consistent configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EcoSysX Qt GUI Build Script (CMake Presets) ===${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
PRESET="${1:-dev}"
RUN_TESTS="${2:-no}"

echo "Project Directory: $PROJECT_DIR"
echo "Preset: $PRESET"

cd "$PROJECT_DIR"

# Validate preset
case "$PRESET" in
    dev|dev-mingw|dev-vs|ci|ci-unix|ci-mingw|release)
        ;;
    clean)
        echo -e "${YELLOW}Cleaning all build directories...${NC}"
        rm -rf build build-dev build-dev-mingw build-dev-vs build-release
        echo -e "${GREEN}Clean complete${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid preset: $PRESET${NC}"
        echo "Valid presets: dev, ci-unix, release, clean"
        exit 1
        ;;
esac

# Configure with CMake preset
echo -e "${GREEN}Configuring with preset '$PRESET'...${NC}"
cmake --preset "$PRESET"

# Build with CMake preset
echo -e "${GREEN}Building...${NC}"
cmake --build --preset "$PRESET"

# Run tests if requested
if [ "$RUN_TESTS" = "test" ]; then
    echo -e "${GREEN}Running tests...${NC}"
    ctest --preset "$PRESET"
fi

# Success message
echo -e "${GREEN}=== Build Complete ===${NC}"
echo ""
echo -e "${CYAN}Usage:${NC}"
echo "  Run tests:       ctest --preset $PRESET"
echo "  Clean build:     $0 clean"
echo "  Build + test:    $0 $PRESET test"
echo ""
echo -e "${YELLOW}Available presets: dev, ci-unix, release${NC}"
