// tests/smoke.test.js
const request = require('supertest');
const app     = require('../server');

test('server loads and health check responds', async () => {
  const res = await request(app).get('/api/health');
  expect(res.statusCode).toBe(200);
});
