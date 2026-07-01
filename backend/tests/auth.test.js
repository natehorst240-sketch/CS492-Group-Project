// tests/auth.test.js
// Unit tests for T1-001 (registration), T1-002 (password), T1-003 (login/session)

const request = require('supertest');
const app     = require('../server');

// Test user — unique timestamp prevents conflicts between test runs
const testEmail    = `testuser_${Date.now()}@example.com`;
const testPassword = 'TestPass1!';
let   authToken    = null;

// ── T1-001: User Registration ────────────────────────────────────────────────
describe('T1-001: User Registration', () => {

  test('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, first_name: 'Test', last_name: 'User' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/created/i);
    expect(res.body.userId).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('rejects missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: testPassword });

    expect(res.statusCode).toBe(400);
  });

  test('rejects missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'another@example.com' });

    expect(res.statusCode).toBe(400);
  });
});

// ── T1-002: Password Validation ──────────────────────────────────────────────
describe('T1-002: Password Validation', () => {

  test('rejects password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: 'Ab1!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/8/);
  });

  test('rejects password without uppercase letter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'noupper@example.com', password: 'testpass1!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  test('rejects password without a number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nonum@example.com', password: 'TestPass!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/number/i);
  });

  test('rejects password without a special character', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nospecial@example.com', password: 'TestPass1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/special/i);
  });

  test('accepts a valid password meeting all requirements', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `valid_pw_${Date.now()}@example.com`, password: 'ValidPass1!' });

    expect(res.statusCode).toBe(201);
  });
});

// ── T1-003: Login & Session Management ──────────────────────────────────────
describe('T1-003: Login & Session Management', () => {

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
    authToken = res.body.token;
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPass1!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: testPassword });

    expect(res.statusCode).toBe(401);
  });

  test('returns current user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.role).toBe('customer');
  });

  test('rejects /api/auth/me with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('logs out successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('token no longer works after logout', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(401);
  });
});
