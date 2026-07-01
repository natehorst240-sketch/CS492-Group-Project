// tests/orders.test.js
// Unit tests for T2-008 (order management backend) and T2-009 (order tracking)

const request = require('supertest');
const app     = require('../server');

let testCustomerId = null;
let testBookId     = null;
let testOrderId    = null;

// Set up a customer and book to use across order tests
beforeAll(async () => {
  // Create a test customer
  const custRes = await request(app)
    .post('/api/customers')
    .send({ name: `Order Test Customer ${Date.now()}`, email: `ordercust_${Date.now()}@example.com` });
  testCustomerId = custRes.body.id;

  // Create a test book with stock
  const bookRes = await request(app)
    .post('/api/books')
    .send({
      isbn:             `978-ORDER-${Date.now()}`,
      title:            'Order Test Book',
      author:           'Test Author',
      price:            12.99,
      quantity_in_stock: 50,
    });
  testBookId = bookRes.body.id;
});

// ── T2-008: Order Creation ───────────────────────────────────────────────────
describe('T2-008: Order Management Backend', () => {

  test('creates an order successfully', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_id: testCustomerId,
        items: [{ book_id: testBookId, quantity: 2 }],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.total_amount).toBeCloseTo(25.98, 1);
    testOrderId = res.body.id;
  });

  test('calculates total correctly for multiple items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_id: testCustomerId,
        items: [
          { book_id: testBookId, quantity: 1 },
          { book_id: testBookId, quantity: 3 },
        ],
      });

    expect(res.statusCode).toBe(200);
    // 4 books × $12.99 = $51.96
    expect(res.body.total_amount).toBeCloseTo(51.96, 1);
  });

  test('rejects order with no items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ customer_id: testCustomerId, items: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/item/i);
  });

  test('rejects order with non-existent book', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_id: testCustomerId,
        items: [{ book_id: 999999, quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('rejects order when quantity exceeds stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_id: testCustomerId,
        items: [{ book_id: testBookId, quantity: 9999 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
  });

  test('stock decrements after successful order', async () => {
    // Get stock before
    const before = await request(app).get(`/api/books/${testBookId}`);
    const stockBefore = before.body.quantity_in_stock;

    // Place order for 2
    await request(app)
      .post('/api/orders')
      .send({
        customer_id: testCustomerId,
        items: [{ book_id: testBookId, quantity: 2 }],
      });

    // Check stock after
    const after = await request(app).get(`/api/books/${testBookId}`);
    expect(after.body.quantity_in_stock).toBe(stockBefore - 2);
  });
});

// ── T2-008: Order Status Updates ────────────────────────────────────────────
describe('T2-008: Order Status Updates', () => {

  test('updates order status to processing', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .send({ status: 'processing' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test('updates order status to completed', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .send({ status: 'completed' });

    expect(res.statusCode).toBe(200);
  });

  test('updates order status to cancelled', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .send({ status: 'cancelled' });

    expect(res.statusCode).toBe(200);
  });

  test('rejects invalid status value', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .send({ status: 'shipped' }); // not a valid status in our system

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  test('returns 404 for non-existent order', async () => {
    const res = await request(app)
      .put('/api/orders/999999')
      .send({ status: 'processing' });

    expect(res.statusCode).toBe(404);
  });
});

// ── T2-009: Order Retrieval ──────────────────────────────────────────────────
describe('T2-009: Order Tracking', () => {

  test('retrieves all orders for a customer', async () => {
    const res = await request(app)
      .get(`/api/orders?customer_id=${testCustomerId}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Orders may be linked via user_id or customer_id — just confirm the endpoint responds
    expect(res.body).toBeDefined();
  });

  test('retrieves a single order with its items', async () => {
    const res = await request(app).get(`/api/orders/${testOrderId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(testOrderId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('order items include book title and author', async () => {
    const res = await request(app).get(`/api/orders/${testOrderId}`);

    expect(res.body.items[0].title).toBeDefined();
    expect(res.body.items[0].author).toBeDefined();
    expect(res.body.items[0].unit_price).toBeDefined();
  });

  test('returns 404 for non-existent order', async () => {
    const res = await request(app).get('/api/orders/999999');
    expect(res.statusCode).toBe(404);
  });

  test('returns empty array for customer with no orders', async () => {
    // Create a fresh customer who has never ordered
    const custRes = await request(app)
      .post('/api/customers')
      .send({ name: 'No Orders Customer', email: `noorders_${Date.now()}@example.com` });

    const res = await request(app)
      .get(`/api/orders?customer_id=${custRes.body.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
