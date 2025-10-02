"""
Llama 3.2-1B-Instruct Service for EcoSysX
Provides LLM-powered agent reasoning via REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import time
import logging
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Global model and tokenizer
model = None
tokenizer = None
model_loaded = False

# Model configuration
MODEL_ID = "meta-llama/Llama-3.2-1B-Instruct"
MAX_NEW_TOKENS = 256
TEMPERATURE = 0.7

def load_model():
    """Load Llama 3.2-1B-Instruct model"""
    global model, tokenizer, model_loaded
    
    try:
        logger.info(f"Loading model: {MODEL_ID}")
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        
        # Load model with automatic device mapping
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype="auto",  # Automatically choose best dtype
            device_map="auto",   # Automatically distribute across available devices
            low_cpu_mem_usage=True
        )
        
        model_loaded = True
        logger.info(f"Model loaded successfully on device: {model.device}")
        logger.info(f"Model dtype: {model.dtype}")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        model_loaded = False
        raise

def create_agent_prompt(agent_data: Dict) -> str:
    """
    Create a prompt for agent decision-making based on ecosystem context
    """
    prompt = f"""You are an intelligent agent in an ecosystem simulation. Analyze the situation and decide your next action.

**Your Status:**
- Energy: {agent_data.get('energy', 50)}%
- Age: {agent_data.get('age', 0)} steps
- Personality: {agent_data.get('personality', 'Balanced')}
- Status: {agent_data.get('status', 'Healthy')}

**Environment Context:**
- Known Resources: {agent_data.get('knownResources', 0)}
- Known Agents: {agent_data.get('knownAgents', 0)}
- Danger Zones: {agent_data.get('dangerZones', 0)}
- Nearby Infected: {agent_data.get('nearbyInfected', 0)}

**Recent Memory:**
{agent_data.get('recentMemory', 'No recent events')}

**Decision Request:**
What should you do next? Consider:
1. Your energy level and survival
2. Social relationships and cooperation
3. Resource collection vs exploration
4. Risk avoidance (infected agents, danger zones)

Respond with a JSON object containing your decision:
{{"action": "explore/collect/socialize/avoid/rest", "reasoning": "brief explanation", "confidence": 0.0-1.0}}"""
    
    return prompt

def parse_llm_response(text: str) -> Dict:
    """
    Parse LLM response and extract structured decision
    Falls back to heuristic if JSON parsing fails
    """
    try:
        # Try to find JSON in response
        import json
        import re
        
        # Look for JSON object in response
        json_match = re.search(r'\{[^}]+\}', text)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return {
                'action': parsed.get('action', 'explore'),
                'reasoning': parsed.get('reasoning', text[:200]),
                'confidence': float(parsed.get('confidence', 0.7)),
                'parsed': True
            }
    except:
        pass
    
    # Fallback: extract decision from natural language
    text_lower = text.lower()
    
    if 'collect' in text_lower or 'resource' in text_lower:
        action = 'collect'
    elif 'avoid' in text_lower or 'danger' in text_lower or 'flee' in text_lower:
        action = 'avoid'
    elif 'social' in text_lower or 'cooperate' in text_lower or 'help' in text_lower:
        action = 'socialize'
    elif 'rest' in text_lower or 'wait' in text_lower or 'low energy' in text_lower:
        action = 'rest'
    else:
        action = 'explore'
    
    return {
        'action': action,
        'reasoning': text[:200],
        'confidence': 0.6,
        'parsed': False
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'loading',
        'model': MODEL_ID,
        'model_loaded': model_loaded
    })

@app.route('/generate', methods=['POST'])
def generate():
    """
    Generate agent decision based on context
    
    Request body:
    {
        "agent": {agent_data},
        "max_tokens": 256,
        "temperature": 0.7
    }
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'fallback': True
        }), 503
    
    try:
        data = request.json
        agent_data = data.get('agent', {})
        max_tokens = data.get('max_tokens', MAX_NEW_TOKENS)
        temperature = data.get('temperature', TEMPERATURE)
        
        # Create prompt
        prompt = create_agent_prompt(agent_data)
        
        # Tokenize
        start_time = time.time()
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=True,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Decode
        response_text = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
        response_time = int((time.time() - start_time) * 1000)
        
        # Parse response
        decision = parse_llm_response(response_text)
        
        logger.info(f"Generated decision: {decision['action']} (confidence: {decision['confidence']}) in {response_time}ms")
        
        return jsonify({
            'decision': decision,
            'raw_response': response_text,
            'response_time': response_time,
            'model': MODEL_ID
        })
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        return jsonify({
            'error': str(e),
            'fallback': True
        }), 500

@app.route('/batch', methods=['POST'])
def batch_generate():
    """
    Batch processing for multiple agents
    
    Request body:
    {
        "agents": [agent_data1, agent_data2, ...],
        "max_tokens": 256,
        "temperature": 0.7
    }
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'fallback': True
        }), 503
    
    try:
        data = request.json
        agents_data = data.get('agents', [])
        max_tokens = data.get('max_tokens', MAX_NEW_TOKENS)
        temperature = data.get('temperature', TEMPERATURE)
        
        results = []
        start_time = time.time()
        
        for agent_data in agents_data[:10]:  # Limit to 10 agents per batch
            prompt = create_agent_prompt(agent_data)
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.9,
                    pad_token_id=tokenizer.eos_token_id
                )
            
            response_text = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
            decision = parse_llm_response(response_text)
            
            results.append({
                'agent_id': agent_data.get('id'),
                'decision': decision,
                'raw_response': response_text
            })
        
        total_time = int((time.time() - start_time) * 1000)
        
        return jsonify({
            'results': results,
            'total_time': total_time,
            'avg_time': total_time // len(results) if results else 0,
            'model': MODEL_ID
        })
        
    except Exception as e:
        logger.error(f"Batch generation error: {e}")
        return jsonify({
            'error': str(e),
            'fallback': True
        }), 500

if __name__ == '__main__':
    # Load model on startup
    logger.info("Starting Llama service...")
    load_model()
    
    # Start Flask server
    app.run(host='0.0.0.0', port=8000, debug=False)
