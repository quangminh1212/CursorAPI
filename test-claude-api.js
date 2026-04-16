/**
 * Test Claude API Adapter
 *
 * Script để test tất cả endpoints của Claude API adapter
 */

const https = require('https');
const http = require('http');

const API_URL = 'http://localhost:8000';
let API_KEY = null;

// ============================================================================
// HTTP REQUEST HELPER
// ============================================================================

function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function test1_HealthCheck() {
    console.log('\n📌 Test 1: Health Check');
    console.log('─'.repeat(60));

    const result = await request('GET', '/health');

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.status === 'ok') {
        console.log('✅ PASS');
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test2_CreateAPIKey() {
    console.log('\n📌 Test 2: Create API Key');
    console.log('─'.repeat(60));

    const result = await request('POST', '/v1/keys', {
        name: 'Test Key'
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 201 && result.data.api_key) {
        API_KEY = result.data.api_key;
        console.log(`✅ PASS - API Key: ${API_KEY.substring(0, 30)}...`);
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test3_ListModels() {
    console.log('\n📌 Test 3: List Models');
    console.log('─'.repeat(60));

    const result = await request('GET', '/v1/models');

    console.log(`Status: ${result.status}`);
    console.log(`Models:`, result.data.data?.map(m => m.id).join(', '));

    if (result.status === 200 && result.data.data?.length > 0) {
        console.log('✅ PASS');
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test4_CreateMessage() {
    console.log('\n📌 Test 4: Create Message (Non-streaming)');
    console.log('─'.repeat(60));

    if (!API_KEY) {
        console.log('❌ SKIP - No API key');
        return false;
    }

    const result = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            { role: 'user', content: 'Say "Hello World" and nothing else.' }
        ],
        max_tokens: 100
    }, {
        'x-api-key': API_KEY
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.content) {
        console.log('✅ PASS');
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test5_StreamingMessage() {
    console.log('\n📌 Test 5: Create Message (Streaming)');
    console.log('─'.repeat(60));

    if (!API_KEY) {
        console.log('❌ SKIP - No API key');
        return false;
    }

    return new Promise((resolve) => {
        const url = new URL('/v1/messages', API_URL);

        const payload = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            messages: [
                { role: 'user', content: 'Count from 1 to 5.' }
            ],
            stream: true
        });

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log('Streaming response:');

            let chunks = 0;
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
                                process.stdout.write(data.delta.text);
                                chunks++;
                            }
                        } catch (e) {}
                    }
                }
            });

            res.on('end', () => {
                console.log('\n');
                if (chunks > 0) {
                    console.log('✅ PASS');
                    resolve(true);
                } else {
                    console.log('❌ FAIL - No chunks received');
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.log('❌ FAIL -', e.message);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

async function test6_LegacyComplete() {
    console.log('\n📌 Test 6: Legacy Complete Endpoint');
    console.log('─'.repeat(60));

    if (!API_KEY) {
        console.log('❌ SKIP - No API key');
        return false;
    }

    const result = await request('POST', '/v1/complete', {
        model: 'claude-3-5-sonnet-20241022',
        prompt: 'What is 2+2? Answer with just the number.'
    }, {
        'x-api-key': API_KEY
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.completion) {
        console.log('✅ PASS');
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test7_InvalidAPIKey() {
    console.log('\n📌 Test 7: Invalid API Key');
    console.log('─'.repeat(60));

    const result = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            { role: 'user', content: 'Hello' }
        ]
    }, {
        'x-api-key': 'invalid-key-12345'
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 401) {
        console.log('✅ PASS - Correctly rejected invalid key');
        return true;
    } else {
        console.log('❌ FAIL - Should return 401');
        return false;
    }
}

async function test8_MissingAPIKey() {
    console.log('\n📌 Test 8: Missing API Key');
    console.log('─'.repeat(60));

    const result = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            { role: 'user', content: 'Hello' }
        ]
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 401) {
        console.log('✅ PASS - Correctly rejected missing key');
        return true;
    } else {
        console.log('❌ FAIL - Should return 401');
        return false;
    }
}

async function test9_MultiTurnConversation() {
    console.log('\n📌 Test 9: Multi-turn Conversation');
    console.log('─'.repeat(60));

    if (!API_KEY) {
        console.log('❌ SKIP - No API key');
        return false;
    }

    const result = await request('POST', '/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
            { role: 'user', content: 'My name is Alice.' },
            { role: 'assistant', content: 'Nice to meet you, Alice!' },
            { role: 'user', content: 'What is my name?' }
        ],
        max_tokens: 100
    }, {
        'x-api-key': API_KEY
    });

    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.content) {
        console.log('✅ PASS');
        return true;
    } else {
        console.log('❌ FAIL');
        return false;
    }
}

async function test10_DifferentModels() {
    console.log('\n📌 Test 10: Different Models');
    console.log('─'.repeat(60));

    if (!API_KEY) {
        console.log('❌ SKIP - No API key');
        return false;
    }

    const models = [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
    ];

    let passed = 0;

    for (const model of models) {
        console.log(`\nTesting model: ${model}`);

        const result = await request('POST', '/v1/messages', {
            model: model,
            messages: [
                { role: 'user', content: 'Say "OK"' }
            ],
            max_tokens: 50
        }, {
            'x-api-key': API_KEY
        });

        console.log(`Status: ${result.status}`);

        if (result.status === 200) {
            console.log(`✅ ${model} works`);
            passed++;
        } else {
            console.log(`❌ ${model} failed`);
        }
    }

    if (passed === models.length) {
        console.log('\n✅ PASS - All models work');
        return true;
    } else {
        console.log(`\n⚠️ PARTIAL - ${passed}/${models.length} models work`);
        return false;
    }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       Claude API Adapter - Test Suite               ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`\n🎯 Target: ${API_URL}`);
    console.log(`⏰ Time: ${new Date().toISOString()}\n`);

    const tests = [
        { name: 'Health Check', fn: test1_HealthCheck },
        { name: 'Create API Key', fn: test2_CreateAPIKey },
        { name: 'List Models', fn: test3_ListModels },
        { name: 'Create Message', fn: test4_CreateMessage },
        { name: 'Streaming Message', fn: test5_StreamingMessage },
        { name: 'Legacy Complete', fn: test6_LegacyComplete },
        { name: 'Invalid API Key', fn: test7_InvalidAPIKey },
        { name: 'Missing API Key', fn: test8_MissingAPIKey },
        { name: 'Multi-turn Conversation', fn: test9_MultiTurnConversation },
        { name: 'Different Models', fn: test10_DifferentModels }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const passed = await test.fn();
            results.push({ name: test.name, passed });
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            results.push({ name: test.name, passed: false });
        }
    }

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                       ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach((r, i) => {
        const status = r.passed ? '✅' : '❌';
        console.log(`${status} Test ${i + 1}: ${r.name}`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`📊 Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

    if (passed === total) {
        console.log('🎉 All tests passed!');
    } else {
        console.log(`⚠️ ${total - passed} test(s) failed`);
    }

    console.log('\n');
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };
