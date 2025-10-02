# Llama 3.2-1B-Instruct Service for EcoSysX

This service provides LLM-powered agent reasoning using Meta's Llama 3.2-1B-Instruct model via a REST API.

## Features

- 🤖 **Real AI Reasoning**: Uses Llama 3.2-1B-Instruct for intelligent agent decisions
- 🚀 **Fast Inference**: Small 1B parameter model optimized for speed
- 📦 **Batch Processing**: Handle multiple agents efficiently
- 🔄 **Automatic Fallback**: Graceful degradation if model unavailable
- 🎯 **Structured Output**: JSON-formatted decisions with confidence scores

## Setup

### Local Development

1. **Install dependencies:**
```bash
cd services/llama-service
pip install -r requirements.txt
```

2. **Run the service:**
```bash
python llama_server.py
```

The service will start on `http://localhost:8000`

### Docker

1. **Build the image:**
```bash
docker build -t ecosysx-llama-service .
```

2. **Run with GPU support (NVIDIA):**
```bash
docker run --gpus all -p 8000:8000 ecosysx-llama-service
```

3. **Run CPU-only:**
```bash
docker run -p 8000:8000 ecosysx-llama-service
```

## API Endpoints

### Health Check
```bash
GET /health
```

Returns model status and readiness.

### Single Agent Decision
```bash
POST /generate
Content-Type: application/json

{
  "agent": {
    "energy": 75,
    "age": 150,
    "personality": "Cautious",
    "status": "Healthy",
    "knownResources": 5,
    "knownAgents": 12,
    "dangerZones": 2,
    "nearbyInfected": 1,
    "recentMemory": "Found resource at (10, 15)"
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
    "reasoning": "High energy but resources nearby, good opportunity",
    "confidence": 0.85,
    "parsed": true
  },
  "raw_response": "...",
  "response_time": 450,
  "model": "meta-llama/Llama-3.2-1B-Instruct"
}
```

### Batch Processing
```bash
POST /batch
Content-Type: application/json

{
  "agents": [
    {"id": "agent1", "energy": 50, ...},
    {"id": "agent2", "energy": 30, ...}
  ],
  "max_tokens": 256,
  "temperature": 0.7
}
```

## Integration with EcoSysX

The main simulator's `LLMService.js` automatically connects to this service. Update the configuration in `EcosystemSimulator.jsx`:

```javascript
const [llmConfig, setLLMConfig] = useState({
  enabled: true,
  endpoint: 'http://localhost:8000',  // Llama service endpoint
  llamaStatus: 'checking'
});
```

## Model Information

- **Model**: meta-llama/Llama-3.2-1B-Instruct
- **Size**: ~1 billion parameters
- **Quantization**: Automatic (FP16/BF16 on GPU, FP32 on CPU)
- **Memory**: ~2-4GB VRAM required
- **Speed**: ~100-500ms per inference (hardware dependent)

## Performance Tips

1. **GPU**: Use CUDA-capable GPU for best performance
2. **Batch Size**: Process 5-10 agents per batch for optimal throughput
3. **Temperature**: Lower (0.5-0.7) for consistent decisions, higher (0.8-1.0) for exploration
4. **Caching**: Model loads once and stays in memory

## Troubleshooting

### Model Download Issues
The model will download automatically (~5GB). Ensure you have:
- Stable internet connection
- Sufficient disk space
- Hugging Face access (login with `huggingface-cli login` if needed)

### Out of Memory
If you get OOM errors:
- Reduce batch size
- Use CPU-only mode
- Consider quantized version (4-bit/8-bit)

### Slow Inference
- Check if GPU is being used: Look for "cuda" in logs
- Reduce `max_tokens` (128-256 is usually sufficient)
- Use batch processing for multiple agents

## License

This service uses Meta's Llama 3.2 model. See [Llama License](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE) for terms.
