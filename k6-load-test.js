import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================
//  LMS Project - Full Load Test (200+ concurrent users)
//  Database: 220 users (207 Students, 3 Teachers, 1 Admin)
// ============================================================
//  Run:  k6 run k6-load-test.js
//  With login:  k6 run -e TEST_EMAIL=manjeet8@lms.com -e TEST_PASSWORD=yourpass k6-load-test.js
//  JSON output: k6 run --out json=results.json k6-load-test.js
// ============================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_USER_EMAIL = __ENV.TEST_EMAIL || '';
const TEST_USER_PASSWORD = __ENV.TEST_PASSWORD || '';

// --- Custom Metrics ---
const healthCheckDuration = new Trend('health_check_duration', true);
const loginDuration = new Trend('login_duration', true);
const profileDuration = new Trend('profile_duration', true);
const apiDuration = new Trend('api_response_time', true);
const loginSuccessRate = new Rate('login_success_rate');
const errorCount = new Counter('error_count');

// --- Test Configuration ---
export const options = {
    // Scenario 1: Ramp up test - real world simulation
    scenarios: {
        // Public endpoints ka test — sabse pehle
        public_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '20s', target: 20 },    // Warm-up: 20 users
                { duration: '30s', target: 50 },    // Normal: 50 users
                { duration: '30s', target: 100 },   // Heavy: 100 users
                { duration: '1m', target: 200 },    // Peak: 200 users (jitne students hain)
                { duration: '30s', target: 250 },   // Stress: 250+ users
                { duration: '20s', target: 0 },     // Cool down
            ],
            exec: 'publicEndpoints',
        },

        // Login + Authenticated endpoints test (agar credentials diye hain)
        auth_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            startTime: '10s',  // 10s delay ke baad start karo
            stages: [
                { duration: '20s', target: 10 },
                { duration: '30s', target: 30 },
                { duration: '30s', target: 50 },
                { duration: '1m', target: 100 },
                { duration: '20s', target: 0 },
            ],
            exec: 'authEndpoints',
        },
    },

    thresholds: {
        // Response times
        http_req_duration: ['p(95)<3000', 'p(99)<5000'],      // 95% < 3s, 99% < 5s
        health_check_duration: ['p(95)<1000'],                   // Health check fast hona chahiye
        api_response_time: ['p(95)<3000'],                      // API < 3s

        // Error rates
        http_req_failed: ['rate<0.15'],  // 15% se kam errors (rate limit ke wajah se thoda zyada)

        // Request rate
        http_reqs: ['rate>10'],  // Kam se kam 10 req/s handle kare
    },
};

// ============================================
//  Scenario 1: Public Endpoints Test
// ============================================
export function publicEndpoints() {
    // Health Check
    group('Health Check', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/health`, {
            tags: { endpoint: 'health' },
        });
        healthCheckDuration.add(Date.now() - start);

        const ok = check(res, {
            'Health: status 200': (r) => r.status === 200,
            'Health: DB connected': (r) => {
                try { return JSON.parse(r.body).database === 'Connected'; }
                catch { return false; }
            },
        });
        if (!ok) errorCount.add(1);
    });

    sleep(randomSleep(0.3, 1));

    // Root API
    group('Root API', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/`, {
            tags: { endpoint: 'root' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Root: status 200': (r) => r.status === 200,
        });
    });

    sleep(randomSleep(0.3, 1));

    // Public Tests endpoint
    group('Public Tests', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/public-tests/teachers/all`, {
            tags: { endpoint: 'public-tests' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Public Tests: responded': (r) => r.status < 500,
        });
    });

    sleep(randomSleep(0.5, 1.5));
}

// ============================================
//  Scenario 2: Auth + Protected Endpoints
// ============================================
export function authEndpoints() {
    // Skip if no credentials provided
    if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
        // Still test login attempt with fake creds (to measure server response under load)
        group('Login Attempt (no creds)', () => {
            const start = Date.now();
            const res = http.post(`${BASE_URL}/api/auth/login`,
                JSON.stringify({ email: `loadtest_vu${__VU}@test.com`, password: 'test123' }),
                { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } }
            );
            loginDuration.add(Date.now() - start);

            check(res, {
                'Login: server responded (401 expected)': (r) => r.status === 401,
            });
        });
        sleep(randomSleep(1, 2));
        return;
    }

    // --- Real Login ---
    let authToken = null;

    group('User Login', () => {
        const start = Date.now();
        const res = http.post(`${BASE_URL}/api/auth/login`,
            JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
            { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } }
        );
        loginDuration.add(Date.now() - start);

        const ok = check(res, {
            'Login: status 200': (r) => r.status === 200,
            'Login: has token': (r) => {
                try { return !!JSON.parse(r.body).token; }
                catch { return false; }
            },
        });

        loginSuccessRate.add(ok ? 1 : 0);

        if (ok) {
            try { authToken = JSON.parse(res.body).token; }
            catch { /* token cookie mein hoga */ }
        } else {
            errorCount.add(1);
        }
    });

    sleep(randomSleep(0.5, 1));

    if (!authToken) return;

    const authHeaders = {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
    };

    // --- Get Profile ---
    group('Get Profile', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/auth/me`, {
            headers: authHeaders,
            tags: { endpoint: 'profile' },
        });
        profileDuration.add(Date.now() - start);

        check(res, {
            'Profile: status 200': (r) => r.status === 200,
            'Profile: has user data': (r) => {
                try { return !!JSON.parse(r.body).email; }
                catch { return false; }
            },
        });
    });

    sleep(randomSleep(0.3, 0.8));

    // --- Tests List ---
    group('Get Tests', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/tests`, {
            headers: authHeaders,
            tags: { endpoint: 'tests' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Tests: responded': (r) => r.status < 500,
        });
    });

    sleep(randomSleep(0.3, 0.8));

    // --- Study Materials ---
    group('Study Materials', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/study-materials`, {
            headers: authHeaders,
            tags: { endpoint: 'study-materials' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Materials: responded': (r) => r.status < 500,
        });
    });

    sleep(randomSleep(0.3, 0.8));

    // --- Notes ---
    group('Get Notes', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/notes`, {
            headers: authHeaders,
            tags: { endpoint: 'notes' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Notes: responded': (r) => r.status < 500,
        });
    });

    sleep(randomSleep(0.5, 1.5));

    // --- Attendance ---
    group('Get Attendance', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/attendance`, {
            headers: authHeaders,
            tags: { endpoint: 'attendance' },
        });
        apiDuration.add(Date.now() - start);

        check(res, {
            'Attendance: responded': (r) => r.status < 500,
        });
    });

    sleep(randomSleep(1, 2));
}

// --- Helper: Random sleep (real user behaviour simulate karo) ---
function randomSleep(min, max) {
    return min + Math.random() * (max - min);
}

// --- Setup ---
export function setup() {
    console.log('');
    console.log('🚀 ========================================');
    console.log('   LMS Load Test - 200+ Concurrent Users');
    console.log('   ========================================');
    console.log(`   Target: ${BASE_URL}`);
    console.log(`   Test User: ${TEST_USER_EMAIL || '(none - public only)'}`);
    console.log(`   DB Users: 220 (207 Students)`);
    console.log('');

    const healthRes = http.get(`${BASE_URL}/api/health`);
    if (healthRes.status !== 200) {
        console.error('❌ Server not responding! Start the server first.');
        return { abort: true };
    }
    console.log('✅ Server is healthy. Starting load test...');
    return { abort: false };
}

// --- Teardown ---
export function teardown(data) {
    console.log('');
    console.log('📊 ========================================');
    console.log('   Load Test Complete!');
    console.log('   ========================================');
    console.log('');
    console.log('   Key Metrics to check:');
    console.log('   • http_req_duration  → Response time');
    console.log('   • http_req_failed    → Error rate');
    console.log('   • http_reqs          → Total requests handled');
    console.log('   • vus               → Peak concurrent users');
    console.log('');
    console.log('   Agar Rate Limiter triggered hota hai,');
    console.log('   toh 429 errors normal hain!');
    console.log('');
}
