/**
 * Example: Sử dụng Claude API Adapter
 *
 * Các ví dụ thực tế về cách sử dụng Claude API adapter
 */

const http = require('http');

// ============================================================================
// CONFIG
// ============================================================================

const API_URL = 'http://localhost:8000';
const API_KEY = 'sk-ant-xxx...'; // Thay bằng API key thật

// ============================================================================
// HTTP REQUEST HELPER
// ============================================================================

function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);

        const payload = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                ...headers
            }
        };

        if (payload) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }

        req.end();
    });
}

function streamRequest(method, path, data, onChunk, onComplete) {
    const url = new URL(path, API_URL);
    const payload = JSON.stringify(data);

    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.delta?.text) {
                            onChunk(data.delta.text);
                        }
                    } catch (e) {}
                }
            }
        });

        res.on('end', () => {
            onComplete();
        });
    });

    req.on('error', (e) => {
        console.error('Error:', e.message);
        onComplete();
    });

    req.write(payload);
    req.end();
}

// ============================================================================
// EXAMPLES
// ============================================================================

async function example1_SimpleChat() {
    console.log('\n📌 Example 1: Simple Chat');
    console.log('─'.repeat(60));

    const response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            { role: 'user', content: 'What is the capital of France?' }
        ],
        max_tokens: 100
    });

    console.log('User: What is the capital of France?');
    console.log('Claude:', response.content);
}

async function example2_StreamingChat() {
    console.log('\n📌 Example 2: Streaming Chat');
    console.log('─'.repeat(60));

    console.log('User: Write a haiku about coding');
    console.log('Claude: ', { newline: false });

    await new Promise((resolve) => {
        streamRequest(
            'POST',
            '/v1/messages',
            {
                model: 'claude-3-5-sonnet-20241022',
                messages: [
                    { role: 'user', content: 'Write a haiku about coding' }
                ],
                stream: true
            },
            (text) => {
                process.stdout.write(text);
            },
            () => {
                console.log('\n');
                resolve();
            }
        );
    });
}

async function example3_MultiTurnConversation() {
    console.log('\n📌 Example 3: Multi-turn Conversation');
    console.log('─'.repeat(60));

    const messages = [
        { role: 'user', content: 'My name is Alice.' },
        { role: 'assistant', content: 'Nice to meet you, Alice! How can I help you today?' },
        { role: 'user', content: 'What is my name?' }
    ];

    const response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: messages,
        max_tokens: 100
    });

    console.log('Conversation:');
    messages.forEach(msg => {
        console.log(`${msg.role}: ${msg.content}`);
    });
    console.log('Claude:', response.content);
}

async function example4_CodeGeneration() {
    console.log('\n📌 Example 4: Code Generation');
    console.log('─'.repeat(60));

    const response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            {
                role: 'user',
                content: 'Write a Python function to calculate fibonacci numbers'
            }
        ],
        max_tokens: 500
    });

    console.log('User: Write a Python function to calculate fibonacci numbers');
    console.log('\nClaude:');
    console.log(response.content);
}

async function example5_DifferentModels() {
    console.log('\n📌 Example 5: Different Models');
    console.log('─'.repeat(60));

    const models = [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
    ];

    const prompt = 'Say hello in one sentence.';

    for (const model of models) {
        console.log(`\nModel: ${model}`);
        console.log('User:', prompt);

        const response = await request('POST', '/v1/messages', {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100
        });

        console.log('Claude:', response.content);
    }
}

async function example6_LongConversation() {
    console.log('\n📌 Example 6: Long Conversation');
    console.log('─'.repeat(60));

    const conversation = [
        { role: 'user', content: 'I want to learn programming. Where should I start?' }
    ];

    console.log('Starting conversation...\n');

    // Turn 1
    console.log('User:', conversation[0].content);
    let response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: conversation,
        max_tokens: 200
    });
    console.log('Claude:', response.content);

    // Turn 2
    conversation.push({ role: 'assistant', content: response.content });
    conversation.push({ role: 'user', content: 'What about Python specifically?' });

    console.log('\nUser:', conversation[2].content);
    response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: conversation,
        max_tokens: 200
    });
    console.log('Claude:', response.content);

    // Turn 3
    conversation.push({ role: 'assistant', content: response.content });
    conversation.push({ role: 'user', content: 'Can you recommend some resources?' });

    console.log('\nUser:', conversation[4].content);
    response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: conversation,
        max_tokens: 200
    });
    console.log('Claude:', response.content);
}

async function example7_SystemPrompt() {
    console.log('\n📌 Example 7: System Prompt (via first message)');
    console.log('─'.repeat(60));

    const response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            {
                role: 'user',
                content: 'You are a helpful assistant that speaks like a pirate. Introduce yourself.'
            }
        ],
        max_tokens: 150
    });

    console.log('Claude:', response.content);
}

async function example8_JSONOutput() {
    console.log('\n📌 Example 8: JSON Output');
    console.log('─'.repeat(60));

    const response = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            {
                role: 'user',
                content: 'Return a JSON object with information about Paris. Include: name, country, population, famous_landmarks (array). Return ONLY the JSON, no other text.'
            }
        ],
        max_tokens: 300
    });

    console.log('Claude:', response.content);

    try {
        const json = JSON.parse(response.content);
        console.log('\nParsed JSON:', json);
    } catch (e) {
        console.log('\nNote: Response may contain markdown formatting');
    }
}

async function example9_ErrorHandling() {
    console.log('\n📌 Example 9: Error Handling');
    console.log('─'.repeat(60));

    // Test with invalid API key
    console.log('Testing with invalid API key...');

    const url = new URL('/v1/messages', API_URL);
    const payload = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }]
    });

    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'invalid-key-12345',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Response:', body);
        });
    });

    req.write(payload);
    req.end();

    await new Promise(resolve => setTimeout(resolve, 1000));
}

async function example10_ListModels() {
    console.log('\n📌 Example 10: List Available Models');
    console.log('─'.repeat(60));

    const response = await request('GET', '/v1/models');

    console.log('Available models:');
    response.data.forEach(model => {
        console.log(`- ${model.id} (${model.display_name})`);
    });
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function runAllExamples() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       Claude API Adapter - Usage Examples           ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`\n🎯 API URL: ${API_URL}`);
    console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
    console.log(`⏰ Time: ${new Date().toISOString()}\n`);

    try {
        await example1_SimpleChat();
        await example2_StreamingChat();
        await example3_MultiTurnConversation();
        await example4_CodeGeneration();
        await example5_DifferentModels();
        await example6_LongConversation();
        await example7_SystemPrompt();
        await example8_JSONOutput();
        await example9_ErrorHandling();
        await example10_ListModels();

        console.log('\n✅ All examples completed!\n');
    } catch (e) {
        console.error('\n❌ Error:', e.message);
    }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
    if (API_KEY === 'sk-ant-xxx...') {
        console.log('\n⚠️  Please set your API_KEY in the code first!');
        console.log('Get your API key by running:');
        console.log('  curl -X POST http://localhost:8000/v1/keys -d \'{"name":"Example"}\'\n');
        process.exit(1);
    }

    runAllExamples().catch(console.error);
}

module.exports = {
    request,
    streamRequest,
    example1_SimpleChat,
    example2_StreamingChat,
    example3_MultiTurnConversation,
    example4_CodeGeneration,
    example5_DifferentModels,
    example6_LongConversation,
    example7_SystemPrompt,
    example8_JSONOutput,
    example9_ErrorHandling,
    example10_ListModels
};
