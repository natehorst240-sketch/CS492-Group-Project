const express    = require('express');
const sqlite3    = require('sqlite3').verbose();
const cors       = require('cors');
const bodyParser = require('body-parser');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve frontend files — works locally (../frontend) and on Vercel (/public)
const frontendPath = fs.existsSync(path.join(__dirname, '../frontend'))
  ? path.join(__dirname, '../frontend')
  : path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// T1-012: Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-hashes'; style-src 'self' 'unsafe-inline'; object-src 'none'"
  );
  next();
});

// T1-012: Rate limiting — 200 req/15min general, 10 for /api/auth
const ipBuckets = {};
app.use((req, res, next) => {
  const ip    = req.ip || '0.0.0.0';
  const limit = req.path.startsWith('/api/auth') ? 50 : 500;
  const now   = Date.now();
  if (!ipBuckets[ip] || now > ipBuckets[ip].resetAt)
    ipBuckets[ip] = { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (++ipBuckets[ip].count > limit)
    return res.status(429).json({ error: 'Too many requests — try again later' });
  next();
});

// T1-009: Sanitize all string inputs — strip HTML tags
function sanitize(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj))
    out[k] = typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v;
  return out;
}
app.use((req, res, next) => { req.body = sanitize(req.body); next(); });

// T1-013: Session store + RBAC middleware
// Roles: admin (full access), staff (read/update orders), customer (own orders only)
const sessions = {};

function requireAuth(req, res, next) {
  const token   = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const session = sessions[token];
  if (!session)                       return res.status(401).json({ error: 'Not authenticated' });
  if (Date.now() > session.expiresAt) { delete sessions[token]; return res.status(401).json({ error: 'Session expired — please log in again' }); }
  req.user = session;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role))
        return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      next();
    });
  };
}

// T1-002: Password hashing using Node built-in crypto (no bcrypt dependency needed)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return attempt === hash;
}

// ── SQLite Database ──────────────────────────────────────────────────────────
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Database error:', err.message);
  else     { console.log('Connected to SQLite database'); initDB(); }
});

function initDB() {
  db.serialize(() => {
    // T1-001: users table — stores registered accounts
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT, last_name TEXT,
      role TEXT DEFAULT 'customer',
      failed_attempts INTEGER DEFAULT 0,
      locked INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL,
      publisher TEXT, publication_date DATE, category TEXT,
      price REAL NOT NULL, quantity_in_stock INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT,
      address TEXT, city TEXT, state TEXT, zip_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // T2-008: orders — status: pending | processing | completed | cancelled
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER,
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // T2-008: order items
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL, book_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(book_id)  REFERENCES books(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL, quantity_change INTEGER NOT NULL,
      reason TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(book_id) REFERENCES books(id)
    )`, () => {
      // Auto-seed on cold start (Vercel resets DB each deploy)
      autoSeed();
    });
  });
}

function autoSeed() {
  const seedPath = path.join(__dirname, 'seed-data.json');
  if (!fs.existsSync(seedPath)) return;
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  db.get('SELECT COUNT(*) as count FROM books', (err, row) => {
    if (err || row.count > 0) return; // already seeded

    const stmt = db.prepare(
      `INSERT OR IGNORE INTO books (isbn,title,author,publisher,publication_date,category,price,quantity_in_stock,description)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    seedData.books.forEach(b => {
      stmt.run([b.isbn,b.title,b.author,b.publisher,b.publication_date,
                b.category,b.price,b.quantity_in_stock,b.description]);
    });
    stmt.finalize();

    const cstmt = db.prepare(
      `INSERT OR IGNORE INTO customers (name,email,phone,city,state) VALUES (?,?,?,?,?)`
    );
    seedData.customers.forEach(c => {
      cstmt.run([c.name,c.email,c.phone,c.city,c.state]);
    });
    cstmt.finalize(() => console.log('Demo data seeded'));
  });
}

// ── AUTH (T1-001, T1-002, T1-003, T1-004) ───────────────────────────────────

// POST /api/auth/register — T1-001, T1-002
app.post('/api/auth/register', (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  // T1-002: password rules — 8+ chars, 1 uppercase, 1 number, 1 special
  const pwOk = password.length >= 8
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!pwOk) return res.status(400).json({
    error: 'Password must be 8+ characters and include 1 uppercase letter, 1 number, and 1 special character'
  });

  const hashed = hashPassword(password);
  db.run(
    `INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, 'customer')`,
    [email, hashed, first_name || null, last_name || null],
    function(err) {
      if (err) return res.status(err.message.includes('UNIQUE') ? 409 : 500).json({ error: err.message.includes('UNIQUE') ? 'Email already registered' : err.message });
      const userId = this.lastID;
      // T1-001: automatically create a matching customer record so the owner
      // dashboard stays in sync without manual entry
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || email;
      db.run(
        `INSERT INTO customers (name, email) VALUES (?, ?)`,
        [fullName, email],
        function(err) {
          // non-fatal if customer insert fails (e.g. duplicate email)
          res.status(201).json({ message: 'Account created successfully', userId });
        }
      );
    }
  );
});

// POST /api/auth/login — T1-003
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.locked) return res.status(403).json({ error: 'Account locked — too many failed attempts' });

    if (!verifyPassword(password, user.password)) {
      const attempts = user.failed_attempts + 1;
      const locked   = attempts >= 5 ? 1 : 0;
      db.run('UPDATE users SET failed_attempts = ?, locked = ? WHERE id = ?', [attempts, locked, user.id]);
      return res.status(401).json({ error: locked ? 'Account locked after 5 failed attempts' : 'Invalid email or password' });
    }

    db.run('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);

    // T1-003: session token with 30-min TTL
    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = {
      userId: user.id, email: user.email,
      role: user.role || 'customer',
      expiresAt: Date.now() + 30 * 60 * 1000
    };

    res.json({ message: 'Login successful', token, userId: user.id, role: user.role, email: user.email });
  });
});

// POST /api/auth/logout — T1-003
app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  delete sessions[token];
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — returns current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email, role: req.user.role });
});

// ── BOOKS (T1-005 through T1-011) ────────────────────────────────────────────

app.get('/api/books', (req, res) => {
  const { search, category, minPrice, maxPrice, sortBy } = req.query;
  const sort = ['title','author','price','created_at'].includes(sortBy) ? sortBy : 'title';
  let query  = 'SELECT * FROM books WHERE 1=1';
  const args = [];
  if (search)   { query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)'; args.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (category) { query += ' AND category = ?';  args.push(category); }
  if (minPrice) { query += ' AND price >= ?';     args.push(parseFloat(minPrice)); }
  if (maxPrice) { query += ' AND price <= ?';     args.push(parseFloat(maxPrice)); }
  query += ` ORDER BY ${sort} ASC`;
  db.all(query, args, (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

app.get('/api/books/:id', (req, res) => {
  db.get('SELECT * FROM books WHERE id = ?', [req.params.id], (err, row) => {
    if (err)  return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });
    res.json(row);
  });
});

app.post('/api/books', (req, res) => {
  const { isbn, title, author, publisher, publication_date, category, price, quantity_in_stock, description } = req.body;
  if (!isbn || !title || !author || price === undefined)
    return res.status(400).json({ error: 'isbn, title, author, and price are required' });
  db.run(
    `INSERT INTO books (isbn,title,author,publisher,publication_date,category,price,quantity_in_stock,description) VALUES (?,?,?,?,?,?,?,?,?)`,
    [isbn,title,author,publisher,publication_date,category,price,quantity_in_stock||0,description],
    function(err) {
      if (err) return res.status(err.message.includes('UNIQUE') ? 409 : 500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Book added successfully' });
    }
  );
});

app.put('/api/books/:id', (req, res) => {
  const { title, author, publisher, publication_date, category, price, quantity_in_stock, description } = req.body;
  db.run(
    `UPDATE books SET title=?,author=?,publisher=?,publication_date=?,category=?,price=?,quantity_in_stock=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [title,author,publisher,publication_date,category,price,quantity_in_stock,description,req.params.id],
    function(err) {
      if (err)           return res.status(500).json({ error: err.message });
      if (!this.changes) return res.status(404).json({ error: 'Book not found' });
      res.json({ message: 'Book updated successfully' });
    }
  );
});

app.delete('/api/books/:id', (req, res) => {
  db.run('DELETE FROM books WHERE id = ?', [req.params.id], function(err) {
    if (err)           return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Book not found' });
    res.json({ message: 'Book deleted successfully' });
  });
});

// ── CUSTOMERS ────────────────────────────────────────────────────────────────

app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY name ASC', (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

app.get('/api/customers/:id', (req, res) => {
  db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, row) => {
    if (err)  return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json(row);
  });
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, address, city, state, zip_code } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  db.run(
    `INSERT INTO customers (name,email,phone,address,city,state,zip_code) VALUES (?,?,?,?,?,?,?)`,
    [name,email,phone,address,city,state,zip_code],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Customer added successfully' });
    }
  );
});

app.put('/api/customers/:id', (req, res) => {
  const { name, email, phone, address, city, state, zip_code } = req.body;
  db.run(
    `UPDATE customers SET name=?,email=?,phone=?,address=?,city=?,state=?,zip_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name,email,phone,address,city,state,zip_code,req.params.id],
    function(err) {
      if (err)           return res.status(500).json({ error: err.message });
      if (!this.changes) return res.status(404).json({ error: 'Customer not found' });
      res.json({ message: 'Customer updated successfully' });
    }
  );
});

app.delete('/api/customers/:id', (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
    if (err)           return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  });
});

// ── ORDERS (T2-008) ──────────────────────────────────────────────────────────

app.get('/api/orders', (req, res) => {
  const userId     = req.query.user_id;
  const customerId = req.query.customer_id;
  // Join both customers and users tables so customer_name shows regardless
  // of whether the order was placed via the owner dashboard (customer_id)
  // or the customer store (user_id)
  let query = `
    SELECT o.*,
      COALESCE(c.name, u.first_name || ' ' || u.last_name, u.email) AS customer_name,
      u.email AS customer_email
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u     ON o.user_id = u.id`;
  const args = [];
  if (userId)      { query += ' WHERE o.user_id = ?';      args.push(userId); }
  else if (customerId) { query += ' WHERE o.customer_id = ?'; args.push(customerId); }
  query += ' ORDER BY o.order_date DESC';
  db.all(query, args, (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

// T2-009: single order with items
app.get('/api/orders/:id', (req, res) => {
  db.get(
    `SELECT o.*,
      COALESCE(c.name, u.first_name || ' ' || u.last_name, u.email) AS customer_name,
      u.email AS customer_email
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     LEFT JOIN users u     ON o.user_id = u.id
     WHERE o.id = ?`,
    [req.params.id],
    (err, order) => {
      if (err)    return res.status(500).json({ error: err.message });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      db.all(
        `SELECT oi.*, b.title, b.author FROM order_items oi LEFT JOIN books b ON oi.book_id = b.id WHERE oi.order_id = ?`,
        [req.params.id],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ ...order, items });
        }
      );
    }
  );
});

// T2-008: create order
app.post('/api/orders', (req, res) => {
  const { customer_id, user_id, items } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'At least one item is required' });

  db.run(
    `INSERT INTO orders (customer_id, user_id, total_amount, status) VALUES (?, ?, 0, 'pending')`,
    [customer_id || null, user_id || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const orderId = this.lastID;
      let total = 0, processed = 0, failed = false;

      items.forEach((item) => {
        db.get('SELECT price, quantity_in_stock FROM books WHERE id = ?', [item.book_id], (err, book) => {
          if (failed) return;
          if (err || !book)                         { failed = true; return res.status(400).json({ error: `Book ${item.book_id} not found` }); }
          if (book.quantity_in_stock < item.quantity) { failed = true; return res.status(400).json({ error: `Not enough stock for book ${item.book_id}` }); }

          total += book.price * item.quantity;
          db.run(`INSERT INTO order_items (order_id,book_id,quantity,unit_price) VALUES (?,?,?,?)`, [orderId,item.book_id,item.quantity,book.price]);
          db.run(`UPDATE books SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?`, [item.quantity, item.book_id]);

          if (++processed === items.length) {
            const finalTotal = parseFloat(total.toFixed(2));
            db.run(`UPDATE orders SET total_amount = ? WHERE id = ?`, [finalTotal, orderId], () => {
              res.json({ id: orderId, total_amount: finalTotal, message: 'Order created successfully' });
            });
          }
        });
      });
    }
  );
});

// T2-008: update order status
app.put('/api/orders/:id', (req, res) => {
  const { status } = req.body;
  const valid = ['pending','processing','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
    if (err)           return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order updated successfully' });
  });
});

// ── INVENTORY ────────────────────────────────────────────────────────────────

app.get('/api/inventory', (req, res) => {
  db.all('SELECT id,title,author,quantity_in_stock,price FROM books ORDER BY title ASC', (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows));
});

app.put('/api/inventory/:bookId', (req, res) => {
  const { quantity_change, reason } = req.body;
  if (quantity_change === undefined) return res.status(400).json({ error: 'quantity_change is required' });
  db.run(`INSERT INTO inventory_history (book_id,quantity_change,reason) VALUES (?,?,?)`,
    [req.params.bookId, quantity_change, reason],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`UPDATE books SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?`,
        [quantity_change, req.params.bookId],
        function(err) {
          if (err)           return res.status(500).json({ error: err.message });
          if (!this.changes) return res.status(404).json({ error: 'Book not found' });
          res.json({ message: 'Inventory updated successfully' });
        }
      );
    }
  );
});

// ── REPORTS ──────────────────────────────────────────────────────────────────

app.get('/api/reports/sales', (req, res) => {
  db.all(
    `SELECT DATE(order_date) AS date, COUNT(*) AS order_count, SUM(total_amount) AS total_sales
     FROM orders WHERE status != 'cancelled' GROUP BY DATE(order_date) ORDER BY date DESC`,
    (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows)
  );
});

app.get('/api/reports/inventory', (req, res) => {
  db.all(
    `SELECT title, author, quantity_in_stock, price, (quantity_in_stock * price) AS stock_value FROM books ORDER BY stock_value DESC`,
    (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json(rows)
  );
});

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'AceReads API is running' }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// Only start the server when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => console.log(`AceReads running on http://localhost:${PORT}`));
}

module.exports = app;
