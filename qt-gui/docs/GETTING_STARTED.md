# EcoSysX Qt GUI - Getting Started

## Quick Start Guide

This guide will help you get the EcoSysX Qt GUI up and running in under 5 minutes.

### Prerequisites Check

Before starting, ensure you have:
- [ ] Qt 6.2 or later installed
- [ ] CMake 3.16 or later
- [ ] C++ compiler (MSVC, GCC, or Clang)
- [ ] Node.js 18+ (for running the simulator backend)

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd EcoSysX/qt-gui
```

#### 2. Configure Build
```bash
mkdir build
cd build
cmake ..
```

#### 3. Build the Application
```bash
cmake --build .
```

#### 4. Run
```bash
# Linux/macOS
./bin/ecosysx-gui

# Windows
.\bin\Debug\ecosysx-gui.exe
```

### First Run

On first launch, you'll see:
1. **Main Window** - Empty workspace with menu bar
2. **File Menu** - Exit option
3. **Help Menu** - About dialog

### What's Next?

- Read the [Configuration Reference](CONFIGURATION_REFERENCE.md)
- Explore the [Architecture Overview](architecture/overview.md)
- Check the [Development Setup](../DEVELOPMENT_SETUP.md) for detailed environment configuration

### Troubleshooting

**CMake can't find Qt6**
```bash
# Set Qt6_DIR environment variable
export Qt6_DIR=/path/to/qt6  # macOS/Linux
$env:Qt6_DIR = "C:\Qt\6.5.0\msvc2019_64"  # Windows
```

**Application won't start**
- Ensure Qt libraries are in PATH
- Run `ldd ecosysx-gui` (Linux) or check Dependencies Walker (Windows)

For more help, see [Troubleshooting Guide](TROUBLESHOOTING.md).

---

**Phase 1 Status**: Basic application stub ready. Full functionality coming in Sprint 1-4.
