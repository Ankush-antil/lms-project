import http from 'k6/http';
import { check, sleep } from 'k6';

// ============================================================
//  LMS - Quick Smoke Test (5 users, 30 seconds)
// ============================================================
//  Run:  k6 run k6-smoke-test.js
// ============================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
    vus: 5,           // 5 virtual users
    duration: '30s',  // 30 seconds tak test karo
    thresholds: {
        http_req_duration: ['p(95)<1500'],  // 95% requests 1.5s se kam
        http_req_failed: ['rate<0.05'],     // 5% se kam error
    },
};

export default function () {
    // Health Check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
        'Health check OK': (r) => r.status === 200,
    });

    sleep(1);

    // Root endpoint
    const rootRes = http.get(`${BASE_URL}/`);
    check(rootRes, {
        'Root OK': (r) => r.status === 200,
    });

    sleep(1);

    // Public tests endpoint (if available)
    const publicRes = http.get(`${BASE_URL}/api/public-tests`);
    check(publicRes, {
        'Public tests accessible': (r) => r.status === 200 || r.status === 404,
    });

    sleep(0.5);
}
