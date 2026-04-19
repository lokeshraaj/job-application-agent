"""
test_hindsight.py — Isolated Hindsight Cloud Integration Test
================================================================
Bypasses the FastAPI routing and directly tests the Hindsight SDK.
Run: python test_hindsight.py

This script will:
1. Load .env credentials
2. Initialize the Hindsight client
3. Create (or verify) a test memory bank
4. Retain a dummy memory
5. Immediately recall it
6. List all memories
7. Print results at every step

If this script fails, the issue is in your Hindsight Cloud credentials
or network config, NOT in the FastAPI routing.
"""

import os
import sys
from dotenv import load_dotenv

# Force-load environment
load_dotenv(override=True)

api_key = os.getenv("HINDSIGHT_API_KEY")
base_url = os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io")

print("=" * 60)
print("HINDSIGHT CLOUD INTEGRATION TEST")
print("=" * 60)
print(f"API Key present: {bool(api_key)}")
print(f"API Key prefix:  {api_key[:16] + '...' if api_key else 'NONE'}")
print(f"Base URL:        {base_url}")
print()

if not api_key:
    print("❌ HINDSIGHT_API_KEY not found in .env!")
    print("   Add it to your backend/.env file:")
    print("   HINDSIGHT_API_KEY=hsk_your_key_here")
    sys.exit(1)

# Step 1: Initialize client
print("[1/6] Initializing Hindsight client...")
try:
    from hindsight_client import Hindsight
    client = Hindsight(base_url=base_url, api_key=api_key, timeout=30.0)
    print(f"  ✅ Client created → {base_url}")
except Exception as e:
    print(f"  ❌ Client init FAILED: {type(e).__name__}: {e}")
    sys.exit(1)

BANK_ID = "autoapply-test-bank"

# Step 2: Create bank
print(f"\n[2/6] Creating test bank: {BANK_ID}")
try:
    result = client.create_bank(
        bank_id=BANK_ID,
        name="AutoApply Test Bank",
        reflect_mission="Test bank for verifying Hindsight Cloud connectivity.",
        disposition={"skepticism": 2, "literalism": 2, "empathy": 4},
    )
    print(f"  ✅ Bank created: {result}")
except Exception as e:
    err = str(e)
    if "already exists" in err.lower() or "409" in err or "conflict" in err.lower():
        print(f"  ✅ Bank already exists (OK)")
    else:
        print(f"  ❌ Bank creation FAILED: {type(e).__name__}: {e}")
        # Continue anyway — might still work

# Step 3: Retain a memory
print(f"\n[3/6] Retaining test memory...")
try:
    result = client.retain(
        bank_id=BANK_ID,
        content="The user is a Staff Software Engineer with 12 years of experience in distributed systems, Rust, and Go. They prefer concise, metrics-driven cold emails under 100 words.",
        context="test_memory",
        metadata={"source": "test_script"},
    )
    print(f"  ✅ Retain succeeded: {result}")
    print(f"  Result type: {type(result)}")
    if result:
        print(f"  Result dir: {[a for a in dir(result) if not a.startswith('_')]}")
except Exception as e:
    print(f"  ❌ Retain FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Recall
print(f"\n[4/6] Recalling memories...")
try:
    results = client.recall(
        bank_id=BANK_ID,
        query="What are the user's preferences?",
        budget="mid",
    )
    print(f"  ✅ Recall succeeded")
    print(f"  Result type: {type(results)}")
    if results:
        print(f"  Result dir: {[a for a in dir(results) if not a.startswith('_')]}")
    if hasattr(results, "results") and results.results:
        for i, r in enumerate(results.results[:5]):
            print(f"  Memory {i}: {r.text[:100]}..." if hasattr(r, "text") else f"  Memory {i}: {r}")
    else:
        print(f"  Raw results: {results}")
except Exception as e:
    print(f"  ❌ Recall FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Step 5: List memories
print(f"\n[5/6] Listing all memories in bank...")
try:
    memories = client.list_memories(bank_id=BANK_ID, limit=50, offset=0)
    print(f"  ✅ list_memories succeeded")
    print(f"  Return type: {type(memories)}")
    if memories:
        print(f"  Dir: {[a for a in dir(memories) if not a.startswith('_')]}")
    
    # Try all possible accessors
    if hasattr(memories, "items"):
        items = memories.items
        print(f"  .items accessor: {type(items)}, count={len(items) if items else 0}")
    if hasattr(memories, "memories"):
        items = memories.memories
        print(f"  .memories accessor: {type(items)}, count={len(items) if items else 0}")
    if hasattr(memories, "results"):
        items = memories.results
        print(f"  .results accessor: {type(items)}, count={len(items) if items else 0}")
    if isinstance(memories, list):
        print(f"  Is raw list, count={len(memories)}")
    if isinstance(memories, dict):
        print(f"  Is dict, keys={list(memories.keys())}")
    
    # Print the first item if we can find it
    test_items = None
    for attr in ["items", "memories", "results"]:
        if hasattr(memories, attr):
            test_items = getattr(memories, attr)
            if test_items:
                break
    if isinstance(memories, list):
        test_items = memories
    
    if test_items:
        first = test_items[0]
        print(f"\n  First memory type: {type(first)}")
        if hasattr(first, '__dict__'):
            print(f"  First memory __dict__: {first.__dict__}")
        elif isinstance(first, dict):
            print(f"  First memory keys: {list(first.keys())}")
        else:
            print(f"  First memory raw: {first}")
except Exception as e:
    print(f"  ❌ list_memories FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Step 6: Reflect
print(f"\n[6/6] Running reflect...")
try:
    answer = client.reflect(
        bank_id=BANK_ID,
        query="What do you know about this user's cold email preferences?",
        budget="low",
    )
    print(f"  ✅ Reflect succeeded")
    print(f"  Type: {type(answer)}")
    if hasattr(answer, "text"):
        print(f"  Answer: {answer.text[:200]}")
    else:
        print(f"  Raw: {answer}")
except Exception as e:
    print(f"  ❌ Reflect FAILED: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
