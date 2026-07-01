// tests/books.test.js
// Unit tests for T1-005 (schema), T1-006 (CRUD APIs), T1-008 (search & filter)

const request = require('supertest');
const app     = require('../server');

let createdBookId = null;

const testBook = {
  isbn:             `978-TEST-${Date.now()}`,
  title:            'Test Book Title',
  author:           'Test Author',
  publisher:        'Test Publisher',
  category:         'Fiction',
  price:            19.99,
  quantity_in_stock: 10,
  description:      'A book used for unit testing.',
};

// ── T1-005 / T1-006: Book CRUD ───────────────────────────────────────────────
describe('T1-005 & T1-006: Book Inventory CRUD', () => {

  test('adds a new book successfully', async () => {
    const res = await request(app)
      .post('/api/books')
      .send(testBook);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBeDefined();
    createdBookId = res.body.id;
  });

  test('rejects book missing required title', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '978-MISSING', price: 9.99 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('rejects book missing required price', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '978-NOPRICE', title: 'No Price Book', author: 'Someone' });

    expect(res.statusCode).toBe(400);
  });

  test('rejects duplicate ISBN', async () => {
    const res = await request(app)
      .post('/api/books')
      .send(testBook);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/unique|already/i);
  });

  test('retrieves a book by ID', async () => {
    const res = await request(app).get(`/api/books/${createdBookId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe(testBook.title);
    expect(res.body.price).toBe(testBook.price);
    expect(res.body.quantity_in_stock).toBe(testBook.quantity_in_stock);
  });

  test('returns 404 for non-existent book ID', async () => {
    const res = await request(app).get('/api/books/999999');
    expect(res.statusCode).toBe(404);
  });

  test('updates a book successfully', async () => {
    const res = await request(app)
      .put(`/api/books/${createdBookId}`)
      .send({ ...testBook, price: 24.99, quantity_in_stock: 20 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  test('confirms updated price is saved', async () => {
    const res = await request(app).get(`/api/books/${createdBookId}`);
    expect(res.body.price).toBe(24.99);
    expect(res.body.quantity_in_stock).toBe(20);
  });

  test('deletes a book successfully', async () => {
    const res = await request(app).delete(`/api/books/${createdBookId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('deleted book no longer accessible', async () => {
    const res = await request(app).get(`/api/books/${createdBookId}`);
    expect(res.statusCode).toBe(404);
  });
});

// ── T1-008 / T1-010: Search & Filter ────────────────────────────────────────
describe('T1-008 & T1-010: Book Search & Filtering', () => {

  test('returns all books when no filter applied', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('searches by title keyword', async () => {
    const res = await request(app).get('/api/books?search=1984');
    expect(res.statusCode).toBe(200);
    if (res.body.length > 0) {
      expect(res.body[0].title.toLowerCase()).toContain('1984');
    }
  });

  test('filters by category', async () => {
    const res = await request(app).get('/api/books?category=Fiction');
    expect(res.statusCode).toBe(200);
    res.body.forEach(book => {
      expect(book.category).toBe('Fiction');
    });
  });

  test('filters by minimum price', async () => {
    const res = await request(app).get('/api/books?minPrice=10');
    expect(res.statusCode).toBe(200);
    res.body.forEach(book => {
      expect(book.price).toBeGreaterThanOrEqual(10);
    });
  });

  test('filters by maximum price', async () => {
    const res = await request(app).get('/api/books?maxPrice=15');
    expect(res.statusCode).toBe(200);
    res.body.forEach(book => {
      expect(book.price).toBeLessThanOrEqual(15);
    });
  });

  test('returns empty array for search with no matches', async () => {
    const res = await request(app).get('/api/books?search=xyznotabookxyz');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });
});
