#!/bin/bash
# EcoSysX Qt GUI - Build Script for Unix/Linux/macOS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EcoSysX Qt GUI Build Script ===${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
BUILD_TYPE="${1:-Debug}"
BUILD_DIR="$PROJECT_DIR/build"
CLEAN_BUILD="${2:-no}"

echo "Project Directory: $PROJECT_DIR"
echo "Build Type: $BUILD_TYPE"
echo "Build Directory: $BUILD_DIR"

# Clean build if requested
if [ "$CLEAN_BUILD" = "clean" ]; then
    echo -e "${YELLOW}Cleaning build directory...${NC}"
    rm -rf "$BUILD_DIR"
fi

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake
echo -e "${GREEN}Configuring with CMake...${NC}"
cmake .. -DCMAKE_BUILD_TYPE="$BUILD_TYPE"

# Build
echo -e "${GREEN}Building...${NC}"
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
cmake --build . -j"$NPROC"

# Success message
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "Executable: ${GREEN}$BUILD_DIR/bin/ecosysx-gui${NC}"
echo ""
echo "To run: cd $BUILD_DIR && ./bin/ecosysx-gui"
echo "To test: cd $BUILD_DIR && ctest --output-on-failure"
