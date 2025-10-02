# Llama 3.2-1B Integration Guide for EcoSysX

This guide explains how to integrate Meta's Llama 3.2-1B-Instruct model with your EcoSysX simulator for real AI-powered agent reasoning.

## Overview

The integration consists of:
1. **Python Backend Service** - Runs Llama 3.2-1B-Instruct model via Hugging Face Transformers
2. **Updated LLMService.js** - Automatically detects and connects to available backends
3. **Dual Backend Support** - Works with both Ollama (existing) and Llama service (new)

## Quick Start

### Option 1: Local Development (Recommended)

1. **Navigate to the service directory:**
```bash
cd services/llama-service
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Start the service:**
```bash
# On Windows
start.bat

# On Linux/Mac
chmod +x start.sh
./start.sh
```

4. **The service will:**
   - Download Llama 3.2-1B model (~5GB, one-time)
   - Load model into memory
   - Start REST API on `http://localhost:8000`

5. **Start your simulator:**
```bash
cd ../..
npm run dev
```

The simulator will automatically detect and connect to the Llama service!

### Option 2: Docker

1. **Build the Docker image:**
```bash
cd services/llama-service
docker build -t ecosysx-llama-service .
```

2. **Run with GPU support (recommended):**
```bash
docker run --gpus all -p 8000:8000 ecosysx-llama-service
```

3. **Or run CPU-only:**
```bash
docker run -p 8000:8000 ecosysx-llama-service
```

## How It Works

### Architecture

```
┌─────────────────────┐
│   React Frontend    │
│  (EcosystemSim)     │
└──────────┬──────────┘
           │
           ├─ LLMService.js (Auto-detect backend)
           │
           ├───────────┬──────────────┐
           │           │              │
┌──────────▼────┐  ┌──▼──────────┐  │
│ Llama Service │  │   Ollama    │  │
│  (Port 8000)  │  │ (Port 11434)│  │
└───────────────┘  └─────────────┘  │
           │                         │
           └─────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  Agent Decision Flow  │
         │  1. Extract context   │
         │  2. Call LLM          │
         │  3. Parse response    │
         │  4. Apply decision    │
         └───────────────────────┘
```

### Backend Priority

The `LLMService.js` checks backends in this order:
1. **Llama Service** (Port 8000) - Faster, more reliable
2. **Ollama** (Port 11434) - Falls back if Llama not available
3. **Simulated** - Heuristic-based if no LLM available

### Request Flow

**1. Simulator extracts agent context:**
```javascript
const agentData = {
  id: agent.id,
  energy: agent.energy,
  age: agent.age,
  personality: agent.personality,
  status: agent.status,
  knownResources: agent.knownResources?.length || 0,
  knownAgents: agent.socialMemory?.knownAgents?.size || 0,
  dangerZones: agent.dangerZones?.length || 0,
  nearbyInfected: nearbyInfected.length,
  recentMemory: agent.getRecentMemory()
};
```

**2. LLMService sends to Llama backend:**
```javascript
POST /generate
{
  "agent": {agentData},
  "max_tokens": 256,
  "temperature": 0.7
}
```

**3. Llama service processes:**
- Creates contextual prompt
- Runs inference through Llama 3.2-1B
- Parses JSON response
- Returns structured decision

**4. Simulator applies decision:**
```javascript
{
  "action": "collect",
  "reasoning": "Energy at 45%, resource nearby, safe to collect",
  "confidence": 0.85,
  "parsed": true
}
```

## Performance Expectations

### Hardware Requirements

| Hardware | Performance | Memory | Speed |
|----------|------------|--------|-------|
| **CPU Only** | Basic | 4GB RAM | 1-2s per agent |
| **GPU (CUDA)** | Good | 2-4GB VRAM | 100-500ms per agent |
| **GPU (High-end)** | Excellent | 8GB+ VRAM | 50-200ms per agent |

### Optimization Tips

1. **Batch Processing**: Process 5-10 agents per request
   ```javascript
   POST /batch
   {
     "agents": [agent1, agent2, agent3, ...],
     "max_tokens": 256,
     "temperature": 0.7
   }
   ```

2. **Selective LLM**: Only use LLM for Causal agents
   ```javascript
   if (agent instanceof CausalAgent && llmConfig.enabled) {
     // Use real LLM
   } else {
     // Use heuristic
   }
   ```

3. **Caching**: Service keeps model loaded in memory

## Configuration

### Update EcosystemSimulator.jsx

The simulator already supports the new backend! Just ensure the Llama service is running.

To explicitly configure:

```javascript
const [llmConfig, setLLMConfig] = useState({
  enabled: true,
  backend: 'auto',  // 'auto', 'llama', or 'ollama'
  llamaEndpoint: 'http://localhost:8000',
  ollamaEndpoint: 'http://localhost:11434',
  currentModel: 'auto'
});
```

### Environment Variables

Set these in your shell or `.env` file:

```bash
# Llama Service
LLAMA_SERVICE_PORT=8000
TRANSFORMERS_CACHE=./model_cache
HF_HOME=./model_cache

# For Hugging Face private models (if needed)
HF_TOKEN=your_token_here
```

## API Reference

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "model": "meta-llama/Llama-3.2-1B-Instruct",
  "model_loaded": true
}
```

### Single Agent Decision
```bash
POST /generate
Content-Type: application/json

{
  "agent": {
    "id": "agent_123",
    "energy": 65,
    "age": 120,
    "personality": "Cautious",
    "status": "Healthy",
    "knownResources": 3,
    "knownAgents": 8,
    "dangerZones": 1,
    "nearbyInfected": 0,
    "recentMemory": "Found food, energy increasing"
  },
  "max_tokens": 256,
  "temperature": 0.7
}
```

Response:
```json
{
  "decision": {
    "action": "collect",
    "reasoning": "Energy at 65% and resource nearby - safe to collect",
    "confidence": 0.82,
    "parsed": true
  },
  "raw_response": "...",
  "response_time": 340,
  "model": "meta-llama/Llama-3.2-1B-Instruct"
}
```

### Batch Processing
```bash
POST /batch
Content-Type: application/json

{
  "agents": [
    {"id": "agent_1", "energy": 50, ...},
    {"id": "agent_2", "energy": 30, ...}
  ],
  "max_tokens": 256,
  "temperature": 0.7
}
```

## Troubleshooting

### "Model not loaded" error

**Cause**: Model is still downloading or loading

**Solution**:
- Wait 2-5 minutes on first startup
- Check logs: `python llama_server.py` 
- Ensure ~5GB disk space available

### Slow inference (>2s per request)

**Cause**: Running on CPU without optimization

**Solutions**:
- Install PyTorch with CUDA: `pip install torch --index-url https://download.pytorch.org/whl/cu118`
- Use batch processing
- Reduce `max_tokens` to 128-192

### "Connection refused" error

**Cause**: Service not running

**Solution**:
```bash
cd services/llama-service
python llama_server.py
```

### Out of memory errors

**Solutions**:
1. Close other applications
2. Use CPU-only mode (slower but works)
3. Reduce batch size
4. Consider 4-bit quantization (requires `bitsandbytes`)

### Model download fails

**Cause**: Network issues or Hugging Face access

**Solution**:
```bash
# Login to Hugging Face
huggingface-cli login

# Manually download
python -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('meta-llama/Llama-3.2-1B-Instruct')"
```

## Monitoring & Debugging

### Check Service Status
```bash
curl http://localhost:8000/health
```

### View Logs
```bash
# In service directory
python llama_server.py
# Watch for "Model loaded successfully" message
```

### Test Inference
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "agent": {
      "id": "test",
      "energy": 50,
      "age": 10,
      "personality": "Balanced",
      "status": "Healthy",
      "knownResources": 2,
      "knownAgents": 5,
      "dangerZones": 0,
      "nearbyInfected": 0
    }
  }'
```

## Deployment to Hugging Face Space

### Update Space Configuration

1. **Add Llama service to `docker-compose.yml`:**
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "7860:7860"
  
  llama-service:
    build: ./services/llama-service
    ports:
      - "8000:8000"
    environment:
      - TRANSFORMERS_CACHE=/app/model_cache
```

2. **Update Dockerfile to include service:**
```dockerfile
# ... existing frontend build ...

# Add Llama service
WORKDIR /app/services/llama-service
COPY services/llama-service/ .
RUN pip install -r requirements.txt

# Start both services
CMD ["sh", "-c", "python /app/services/llama-service/llama_server.py & npm run serve"]
```

3. **Configure hardware:** Select "GPU: 1x T4" or higher in Space settings

## Benefits Over Ollama

| Feature | Llama Service | Ollama |
|---------|---------------|--------|
| **Speed** | ✅ Faster (optimized) | Good |
| **Reliability** | ✅ More stable | Variable |
| **Setup** | Simple (pip install) | Requires Ollama install |
| **Memory** | 2-4GB | 4-8GB |
| **Deployment** | Easy (Python) | Complex |
| **Customization** | ✅ Full control | Limited |

## Next Steps

1. ✅ Start the Llama service
2. ✅ Run your simulator
3. ✅ Watch agents make smarter decisions!
4. 🎯 Fine-tune temperature (0.5-0.9) for different behaviors
5. 📊 Monitor performance in the simulator UI
6. 🚀 Deploy to Hugging Face with GPU support

## Support

- Check `/health` endpoint for service status
- Review logs for detailed error messages
- See `README.md` in `services/llama-service/` for more details
- Test with single agent before batch processing

---

**Your simulator now has real AI! 🤖🧠** 

The agents will make context-aware decisions using state-of-the-art language models instead of simple heuristics.
