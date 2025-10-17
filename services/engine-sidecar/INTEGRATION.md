# Engine Sidecar Integration Guide

## Quick Start

### 1. Install Dependencies

First, build the Genesis Engine package:

```bash
cd packages/genx-engine
npm install
npm run build
```

Then install engine-sidecar dependencies:

```bash
cd services/engine-sidecar
npm install
```

### 2. Test the Sidecar

Run the test suite:

```bash
cd services/engine-sidecar
npm test
```

Expected output:
```
🧪 Starting sidecar test...
=== Test 1: Ping ===
✅ Ping test passed
=== Test 2: Init ===
ℹ️  Init failed (Mesa not available, expected)
...
```

### 3. Launch from Qt GUI

The Qt GUI will automatically find and launch the sidecar if it's at:
```
services/engine-sidecar/main.js
```

No additional configuration needed!

## Manual Testing

### Start the sidecar:
```bash
cd services/engine-sidecar
npm start
```

### Send commands (in the same terminal):
```json
{"op":"ping"}
{"op":"init","data":{"provider":"mesa"}}
{"op":"step","data":{"steps":10}}
{"op":"snapshot","data":{"kind":"metrics"}}
{"op":"stop"}
```

Press `Ctrl+D` (or `Ctrl+Z` on Windows) to close stdin and exit gracefully.

## Integration with Qt GUI

### How It Works

1. **Qt EngineClient** launches: `node services/engine-sidecar/main.js`
2. **Communication** happens via stdin/stdout (JSON-RPC)
3. **Responses** are parsed and emitted as Qt signals
4. **UI updates** automatically from signal handlers

### Example Qt Code (already implemented):

```cpp
// In MainWindow::initializeEngine()
m_engineClient = new EngineClient(this);
m_engineClient->setSidecarScript(
    QDir::current().filePath("services/engine-sidecar/main.js")
);

// Start simulation
m_engineClient->start();
m_engineClient->init(config);

// Step simulation
m_engineClient->step(10);

// Get snapshot
m_engineClient->requestSnapshot("metrics");

// Stop
m_engineClient->stop();
```

## Provider Setup

The sidecar needs a simulation provider (Mesa, MASON, or Agents.jl) to run simulations.

### Option 1: Mesa (Python) - Recommended

```bash
cd services/mesa-sidecar
pip install -r requirements.txt
# Test it
python main.py
```

### Option 2: MASON (Java)

```bash
cd services/mason-sidecar
mvn clean package
# Test it
java -jar target/mason-sidecar-1.0.0-jar-with-dependencies.jar
```

### Option 3: Agents.jl (Julia)

```bash
cd services/agents-sidecar
julia --project=. -e 'using Pkg; Pkg.instantiate()'
# Test it
julia --project=. main.jl
```

## Troubleshooting

### "Cannot find module '@ecosysx/genx-engine'"

**Solution:**
```bash
cd packages/genx-engine
npm install
npm run build
cd ../../services/engine-sidecar
npm install
```

### "Sidecar script not found" in Qt GUI

**Solution:** Ensure you're running the Qt GUI from the workspace root, or set the sidecar path:

```cpp
m_engineClient->setSidecarScript(
    "C:/Users/Bbeie/Github/EcoSysX/EcoSysX/services/engine-sidecar/main.js"
);
```

### Provider not available

The sidecar will respond with an error if the provider isn't available. Make sure:
- Mesa: Python environment with Mesa installed
- MASON: Java JAR built with Maven
- Agents.jl: Julia environment with packages installed

### Node.js not found

**Solution:** Ensure Node.js is in PATH, or set the path in Qt:

```cpp
m_engineClient->setNodePath("C:/Program Files/nodejs/node.exe");
```

## What's Next?

1. ✅ **Sidecar created** - JSON-RPC bridge is ready
2. ⏳ **Test integration** - Launch Qt GUI and try connecting
3. ⏳ **Setup provider** - Install Mesa/MASON/Agents.jl
4. ⏳ **Run simulation** - Full end-to-end test

Try launching the GUI and clicking "Initialize" to test the integration!
