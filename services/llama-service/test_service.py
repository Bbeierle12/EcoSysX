"""
Test script for Llama 3.2-1B-Instruct service
Verifies the service is working correctly
"""

import requests
import json
import time

# Service endpoint
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Service is {data['status']}")
            print(f"   Model: {data['model']}")
            print(f"   Model loaded: {data['model_loaded']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to service. Is it running?")
        print("   Start it with: cd services/llama-service && python llama_server.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_generate():
    """Test single agent generation"""
    print("\n🧪 Testing agent decision generation...")
    
    test_agent = {
        "id": "test_agent_001",
        "energy": 45,
        "age": 120,
        "personality": "Cautious",
        "status": "Healthy",
        "knownResources": 3,
        "knownAgents": 8,
        "dangerZones": 1,
        "nearbyInfected": 0,
        "recentMemory": "Found resource at (10, 15), avoided infected agent"
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/generate",
            json={"agent": test_agent, "max_tokens": 256, "temperature": 0.7},
            timeout=30
        )
        elapsed = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            decision = data['decision']
            
            print(f"✅ Generation successful ({elapsed:.0f}ms)")
            print(f"   Action: {decision['action']}")
            print(f"   Confidence: {decision['confidence']:.2f}")
            print(f"   Parsed: {decision['parsed']}")
            print(f"   Reasoning: {decision['reasoning'][:100]}...")
            return True
        else:
            print(f"❌ Generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_batch():
    """Test batch processing"""
    print("\n📦 Testing batch processing...")
    
    agents = [
        {"id": "agent_1", "energy": 30, "age": 50, "personality": "Aggressive", "status": "Healthy"},
        {"id": "agent_2", "energy": 70, "age": 100, "personality": "Cautious", "status": "Healthy"},
        {"id": "agent_3", "energy": 15, "age": 150, "personality": "Balanced", "status": "Infected"}
    ]
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/batch",
            json={"agents": agents, "max_tokens": 128, "temperature": 0.7},
            timeout=60
        )
        elapsed = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            results = data['results']
            
            print(f"✅ Batch processing successful ({elapsed:.0f}ms total)")
            print(f"   Agents processed: {len(results)}")
            print(f"   Average time: {data['avg_time']}ms per agent")
            
            for result in results:
                print(f"   - {result['agent_id']}: {result['decision']['action']} (confidence: {result['decision']['confidence']:.2f})")
            
            return True
        else:
            print(f"❌ Batch processing failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("  Llama 3.2-1B-Instruct Service Test Suite")
    print("=" * 60)
    
    # Run tests
    health_ok = test_health()
    
    if not health_ok:
        print("\n⚠️  Cannot proceed without healthy service")
        return
    
    generate_ok = test_generate()
    batch_ok = test_batch()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Test Summary")
    print("=" * 60)
    print(f"Health Check: {'✅' if health_ok else '❌'}")
    print(f"Single Generation: {'✅' if generate_ok else '❌'}")
    print(f"Batch Processing: {'✅' if batch_ok else '❌'}")
    
    if health_ok and generate_ok and batch_ok:
        print("\n🎉 All tests passed! Service is ready for use.")
        print("\n📋 Next steps:")
        print("   1. Keep this service running")
        print("   2. Start your simulator: npm run dev")
        print("   3. Your agents will automatically use real AI! 🤖")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")

if __name__ == "__main__":
    main()
