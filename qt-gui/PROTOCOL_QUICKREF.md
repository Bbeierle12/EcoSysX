# JSON-RPC Protocol Quick Reference

**For Qt GUI ↔ Engine Sidecar Communication**

---

## 📡 Protocol Format

### Request (Qt → Sidecar)
```json
{
  "op": "operation_name",
  "data": { /* parameters */ }
}
```

### Response (Sidecar → Qt)
```json
{
  "success": true,
  "op": "operation_name",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "op": "operation_name",
  "error": "Error message",
  "stack": "Stack trace (optional)"
}
```

---

## 🔧 Operations

### 1. ping
**Purpose**: Health check

**Request:**
```json
{"op": "ping"}
```

**Response:**
```json
{
  "success": true,
  "op": "ping",
  "data": {
    "status": "idle|running",
    "tick": 0,
    "version": "1.0.0"
  }
}
```

---

### 2. init
**Purpose**: Initialize simulation

**Request:**
```json
{
  "op": "init",
  "data": {
    "provider": "mesa",
    "config": {
      "schema": "GENX_CFG_V1",
      "simulation": {
        "populationSize": 500,
        "worldSize": 100,
        "maxSteps": 1000
      },
      "agents": { /* ... */ },
      "disease": { /* ... */ },
      "environment": { /* ... */ },
      "rng": { "masterSeed": "seed" }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "op": "init",
  "data": {
    "tick": 0,
    "metrics": {
      "pop": 500,
      "sir": { "S": 475, "I": 25, "R": 0 },
      "dead": 0,
      "energyMean": 50.0
    },
    "provider": {
      "name": "mesa",
      "version": "2.0.0",
      "language": "Python"
    }
  }
}
```

---

### 3. step
**Purpose**: Advance simulation

**Request:**
```json
{
  "op": "step",
  "data": {
    "steps": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "op": "step",
  "data": {
    "tick": 10,
    "metrics": {
      "pop": 498,
      "sir": { "S": 450, "I": 35, "R": 13 },
      "dead": 2,
      "energyMean": 48.3
    }
  }
}
```

---

### 4. snapshot
**Purpose**: Get simulation state

**Request (Metrics):**
```json
{
  "op": "snapshot",
  "data": {
    "kind": "metrics"
  }
}
```

**Request (Full):**
```json
{
  "op": "snapshot",
  "data": {
    "kind": "full"
  }
}
```

**Response (Metrics):**
```json
{
  "success": true,
  "op": "snapshot",
  "data": {
    "snapshot": {
      "schema": "GENX_SNAP_V1",
      "tick": 10,
      "metrics": {
        "pop": 498,
        "sir": { "S": 450, "I": 35, "R": 13 },
        "dead": 2,
        "energyMean": 48.3
      },
      "providerInfo": {
        "name": "mesa",
        "version": "2.0.0"
      },
      "buildHash": "abc123",
      "simDigest": "def456"
    },
    "kind": "metrics"
  }
}
```

**Response (Full):**
```json
{
  "success": true,
  "op": "snapshot",
  "data": {
    "snapshot": {
      "schema": "GENX_SNAP_V1",
      "tick": 10,
      "metrics": { /* ... */ },
      "state": {
        "agents": [
          {
            "id": "agent_0",
            "x": 45.3,
            "y": 67.2,
            "energy": 52.1,
            "infected": false,
            "recovered": false,
            "age": 10
          }
        ],
        "environment": {
          "grid": [[0.3, 0.5], [0.4, 0.6]],
          "worldSize": 100
        },
        "tick": 10
      }
    },
    "kind": "full"
  }
}
```

---

### 5. stop
**Purpose**: Terminate simulation

**Request:**
```json
{"op": "stop"}
```

**Response:**
```json
{
  "success": true,
  "op": "stop",
  "data": {
    "message": "Simulation stopped successfully"
  }
}
```

---

## 🔨 Implementation Checklist

### EngineClient.cpp Changes

#### 1. Set SeparateChannels
```cpp
// In constructor
m_process->setProcessChannelMode(QProcess::SeparateChannels);
```

#### 2. Use "data" instead of "params"
```cpp
// OLD - Don't use this
message["params"] = configData;

// NEW - Use this
message["data"] = configData;
```

#### 3. Parse Response Correctly
```cpp
void EngineClient::processLine(const QString& line) {
    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(line.toUtf8(), &parseError);
    
    if (parseError.error != QJsonParseError::NoError) {
        emit errorOccurred("JSON parse error: " + parseError.errorString());
        return;
    }
    
    QJsonObject response = doc.object();
    
    // Check success
    bool success = response["success"].toBool();
    QString op = response["op"].toString();
    
    if (!success) {
        QString error = response["error"].toString();
        emit errorOccurred(error);
        setState(EngineState::Error);
        return;
    }
    
    // Extract data
    QJsonObject data = response["data"].toObject();
    
    // Handle by operation
    if (op == "init") {
        m_currentTick = data["tick"].toInt();
        emit initialized(data);
    } else if (op == "step") {
        m_currentTick = data["tick"].toInt();
        emit stepped(data);
    } else if (op == "snapshot") {
        QJsonObject snapshot = data["snapshot"].toObject();
        QString kind = data["kind"].toString();
        emit snapshotReceived(snapshot, kind);
    } else if (op == "stop") {
        emit stopped();
    }
}
```

#### 4. Auto-Snapshot After Step
```cpp
void EngineClient::sendStep(int steps) {
    // ... send step command
    
    // After receiving step response:
    connect(this, &EngineClient::stepped, this, [this]() {
        requestSnapshot("metrics");
    }, Qt::SingleShotConnection);
}
```

---

## 🧪 Test Stub Reference

### Minimal Test Stub (test-engine-stub.mjs)
```javascript
#!/usr/bin/env node
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let tick = 0;
let running = false;

rl.on('line', (line) => {
  try {
    const req = JSON.parse(line);
    let response = { success: true, op: req.op };
    
    switch (req.op) {
      case 'ping':
        response.data = { 
          status: running ? 'running' : 'idle', 
          tick, 
          version: '1.0.0' 
        };
        break;
        
      case 'init':
        tick = 0;
        running = true;
        response.data = {
          tick: 0,
          metrics: { 
            pop: 500, 
            sir: { S: 475, I: 25, R: 0 },
            dead: 0,
            energyMean: 50.0 
          },
          provider: { name: 'stub', version: '1.0.0' }
        };
        break;
        
      case 'step':
        if (!running) {
          response.success = false;
          response.error = 'Not running';
          break;
        }
        tick += req.data?.steps || 1;
        response.data = {
          tick,
          metrics: { 
            pop: 498, 
            sir: { S: 450, I: 35, R: 13 },
            dead: 2,
            energyMean: 48.3 
          }
        };
        break;
        
      case 'snapshot':
        if (!running) {
          response.success = false;
          response.error = 'Not running';
          break;
        }
        const kind = req.data?.kind || 'metrics';
        response.data = {
          snapshot: {
            schema: 'GENX_SNAP_V1',
            tick,
            metrics: { 
              pop: 498, 
              sir: { S: 450, I: 35, R: 13 },
              dead: 2,
              energyMean: 48.3 
            }
          },
          kind
        };
        break;
        
      case 'stop':
        running = false;
        tick = 0;
        response.data = { message: 'Stopped' };
        break;
        
      default:
        response.success = false;
        response.error = `Unknown operation: ${req.op}`;
    }
    
    console.log(JSON.stringify(response));
    
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error.message
    };
    console.log(JSON.stringify(errorResponse));
  }
});
```

---

## 🎯 Key Points for Codex

1. **Always use `data` field** in requests, not `params`
2. **Always check `success` field** in responses
3. **Extract data from `response["data"]`**, not `response` directly
4. **Handle errors gracefully** with `success: false`
5. **Use SeparateChannels** for process mode
6. **Parse JSON with error handling** using QJsonParseError
7. **Auto-request snapshot** after step for UI updates
8. **Forward stderr to log panel** for debugging

---

## 📝 Common Pitfalls

❌ **Wrong**: `message["params"] = data;`  
✅ **Right**: `message["data"] = data;`

❌ **Wrong**: `int tick = response["tick"].toInt();`  
✅ **Right**: `int tick = response["data"]["tick"].toInt();`

❌ **Wrong**: Assuming success, not checking  
✅ **Right**: Check `response["success"].toBool()` first

❌ **Wrong**: Reading JSON from stderr  
✅ **Right**: JSON on stdout, logs on stderr

---

*Quick Reference v1.0 - October 17, 2025*
