"""
Example: Sử dụng Claude API Adapter với Python

Các ví dụ thực tế về cách sử dụng Claude API adapter với Python
"""

import requests
import json
from typing import List, Dict, Generator

# ============================================================================
# CONFIG
# ============================================================================

API_URL = "http://localhost:8000"
API_KEY = "sk-ant-xxx..."  # Thay bằng API key thật

# ============================================================================
# HTTP REQUEST HELPERS
# ============================================================================

def request(method: str, path: str, data: dict = None) -> dict:
    """Make HTTP request to Claude API"""
    url = f"{API_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }

    if method == "GET":
        response = requests.get(url, headers=headers)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    else:
        raise ValueError(f"Unsupported method: {method}")

    return response.json()

def stream_request(path: str, data: dict) -> Generator[str, None, None]:
    """Make streaming request to Claude API"""
    url = f"{API_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }

    response = requests.post(url, headers=headers, json=data, stream=True)

    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                try:
                    data = json.loads(line[6:])
                    if 'delta' in data and 'text' in data['delta']:
                        yield data['delta']['text']
                except json.JSONDecodeError:
                    pass

# ============================================================================
# EXAMPLES
# ============================================================================

def example1_simple_chat():
    """Example 1: Simple Chat"""
    print("\n📌 Example 1: Simple Chat")
    print("─" * 60)

    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
            {"role": "user", "content": "What is the capital of France?"}
        ],
        "max_tokens": 100
    })

    print("User: What is the capital of France?")
    print(f"Claude: {response['content']}")

def example2_streaming_chat():
    """Example 2: Streaming Chat"""
    print("\n📌 Example 2: Streaming Chat")
    print("─" * 60)

    print("User: Write a haiku about coding")
    print("Claude: ", end="", flush=True)

    for text in stream_request("/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
            {"role": "user", "content": "Write a haiku about coding"}
        ],
        "stream": True
    }):
        print(text, end="", flush=True)

    print("\n")

def example3_multi_turn_conversation():
    """Example 3: Multi-turn Conversation"""
    print("\n📌 Example 3: Multi-turn Conversation")
    print("─" * 60)

    messages = [
        {"role": "user", "content": "My name is Alice."},
        {"role": "assistant", "content": "Nice to meet you, Alice! How can I help you today?"},
        {"role": "user", "content": "What is my name?"}
    ]

    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": messages,
        "max_tokens": 100
    })

    print("Conversation:")
    for msg in messages:
        print(f"{msg['role']}: {msg['content']}")
    print(f"Claude: {response['content']}")

def example4_code_generation():
    """Example 4: Code Generation"""
    print("\n📌 Example 4: Code Generation")
    print("─" * 60)

    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
            {
                "role": "user",
                "content": "Write a Python function to calculate fibonacci numbers"
            }
        ],
        "max_tokens": 500
    })

    print("User: Write a Python function to calculate fibonacci numbers")
    print("\nClaude:")
    print(response['content'])

def example5_different_models():
    """Example 5: Different Models"""
    print("\n📌 Example 5: Different Models")
    print("─" * 60)

    models = [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-haiku-20240307"
    ]

    prompt = "Say hello in one sentence."

    for model in models:
        print(f"\nModel: {model}")
        print(f"User: {prompt}")

        response = request("POST", "/v1/messages", {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 100
        })

        print(f"Claude: {response['content']}")

def example6_long_conversation():
    """Example 6: Long Conversation"""
    print("\n📌 Example 6: Long Conversation")
    print("─" * 60)

    conversation = [
        {"role": "user", "content": "I want to learn programming. Where should I start?"}
    ]

    print("Starting conversation...\n")

    # Turn 1
    print(f"User: {conversation[0]['content']}")
    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": conversation,
        "max_tokens": 200
    })
    print(f"Claude: {response['content']}")

    # Turn 2
    conversation.append({"role": "assistant", "content": response['content']})
    conversation.append({"role": "user", "content": "What about Python specifically?"})

    print(f"\nUser: {conversation[2]['content']}")
    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": conversation,
        "max_tokens": 200
    })
    print(f"Claude: {response['content']}")

    # Turn 3
    conversation.append({"role": "assistant", "content": response['content']})
    conversation.append({"role": "user", "content": "Can you recommend some resources?"})

    print(f"\nUser: {conversation[4]['content']}")
    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": conversation,
        "max_tokens": 200
    })
    print(f"Claude: {response['content']}")

def example7_json_output():
    """Example 7: JSON Output"""
    print("\n📌 Example 7: JSON Output")
    print("─" * 60)

    response = request("POST", "/v1/messages", {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
            {
                "role": "user",
                "content": "Return a JSON object with information about Paris. Include: name, country, population, famous_landmarks (array). Return ONLY the JSON, no other text."
            }
        ],
        "max_tokens": 300
    })

    print(f"Claude: {response['content']}")

    try:
        # Try to extract JSON from response
        content = response['content']
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()

        parsed = json.loads(content)
        print("\nParsed JSON:")
        print(json.dumps(parsed, indent=2))
    except Exception as e:
        print(f"\nNote: Could not parse JSON: {e}")

def example8_list_models():
    """Example 8: List Available Models"""
    print("\n📌 Example 8: List Available Models")
    print("─" * 60)

    response = request("GET", "/v1/models", None)

    print("Available models:")
    for model in response['data']:
        print(f"- {model['id']} ({model['display_name']})")

def example9_with_anthropic_sdk():
    """Example 9: Using Anthropic SDK"""
    print("\n📌 Example 9: Using Anthropic SDK")
    print("─" * 60)

    try:
        from anthropic import Anthropic

        client = Anthropic(
            api_key=API_KEY,
            base_url=API_URL
        )

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": "Hello, Claude! Tell me a joke."}
            ]
        )

        print("User: Hello, Claude! Tell me a joke.")
        print(f"Claude: {message.content[0].text}")

    except ImportError:
        print("⚠️  Anthropic SDK not installed. Install with:")
        print("   pip install anthropic")

def example10_streaming_with_anthropic_sdk():
    """Example 10: Streaming with Anthropic SDK"""
    print("\n📌 Example 10: Streaming with Anthropic SDK")
    print("─" * 60)

    try:
        from anthropic import Anthropic

        client = Anthropic(
            api_key=API_KEY,
            base_url=API_URL
        )

        print("User: Count from 1 to 10")
        print("Claude: ", end="", flush=True)

        with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": "Count from 1 to 10"}
            ]
        ) as stream:
            for text in stream.text_stream:
                print(text, end="", flush=True)

        print("\n")

    except ImportError:
        print("⚠️  Anthropic SDK not installed. Install with:")
        print("   pip install anthropic")

# ============================================================================
# CHATBOT CLASS
# ============================================================================

class ClaudeChatbot:
    """Simple chatbot using Claude API"""

    def __init__(self, model: str = "claude-3-5-sonnet-20241022"):
        self.model = model
        self.conversation: List[Dict[str, str]] = []

    def chat(self, message: str) -> str:
        """Send a message and get response"""
        self.conversation.append({"role": "user", "content": message})

        response = request("POST", "/v1/messages", {
            "model": self.model,
            "messages": self.conversation,
            "max_tokens": 1024
        })

        assistant_message = response['content']
        self.conversation.append({"role": "assistant", "content": assistant_message})

        return assistant_message

    def stream_chat(self, message: str) -> Generator[str, None, None]:
        """Send a message and stream response"""
        self.conversation.append({"role": "user", "content": message})

        full_response = ""
        for text in stream_request("/v1/messages", {
            "model": self.model,
            "messages": self.conversation,
            "stream": True
        }):
            full_response += text
            yield text

        self.conversation.append({"role": "assistant", "content": full_response})

    def reset(self):
        """Reset conversation history"""
        self.conversation = []

def example11_chatbot_class():
    """Example 11: Using Chatbot Class"""
    print("\n📌 Example 11: Using Chatbot Class")
    print("─" * 60)

    bot = ClaudeChatbot()

    # Turn 1
    response = bot.chat("Hi! My name is Bob.")
    print("User: Hi! My name is Bob.")
    print(f"Claude: {response}")

    # Turn 2
    response = bot.chat("What's my name?")
    print("\nUser: What's my name?")
    print(f"Claude: {response}")

    # Turn 3 (streaming)
    print("\nUser: Tell me a short story")
    print("Claude: ", end="", flush=True)
    for text in bot.stream_chat("Tell me a short story"):
        print(text, end="", flush=True)
    print("\n")

# ============================================================================
# RUN ALL EXAMPLES
# ============================================================================

def run_all_examples():
    """Run all examples"""
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║       Claude API Adapter - Python Examples          ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"\n🎯 API URL: {API_URL}")
    print(f"🔑 API Key: {API_KEY[:20]}...")
    print(f"⏰ Time: 2026-04-16T16:15:18.083Z\n")

    try:
        example1_simple_chat()
        example2_streaming_chat()
        example3_multi_turn_conversation()
        example4_code_generation()
        example5_different_models()
        example6_long_conversation()
        example7_json_output()
        example8_list_models()
        example9_with_anthropic_sdk()
        example10_streaming_with_anthropic_sdk()
        example11_chatbot_class()

        print("\n✅ All examples completed!\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    if API_KEY == "sk-ant-xxx...":
        print("\n⚠️  Please set your API_KEY in the code first!")
        print("Get your API key by running:")
        print("  curl -X POST http://localhost:8000/v1/keys -d '{\"name\":\"Example\"}'")
        print()
        exit(1)

    run_all_examples()
