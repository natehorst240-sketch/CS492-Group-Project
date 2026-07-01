-- AceReads Database Schema
-- Matches the team's server.js SQLite schema
-- Run in MySQL Workbench: mysql -u root -p < schema.sql
-- Or use SQLite: sqlite3 database.db < schema.sql

-- For MySQL (team's backend uses SQLite but this file supports both)
CREATE DATABASE IF NOT EXISTS acereads;
USE acereads;

-- Books table (T1-005)
CREATE TABLE IF NOT EXISTS books (
  id               INTEGER PRIMARY KEY AUTO_INCREMENT,
  isbn             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  author           TEXT NOT NULL,
  publisher        TEXT,
  publication_date DATE,
  category         TEXT,
  price            REAL NOT NULL,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  description      TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table (replaces users — no login in this version)
CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTO_INCREMENT,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  phone      TEXT,
  address    TEXT,
  city       TEXT,
  state      TEXT,
  zip_code   TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table (T2-008)
-- status values: pending | processing | completed | cancelled
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTO_INCREMENT,
  customer_id  INTEGER NOT NULL,
  order_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount REAL NOT NULL,
  status       TEXT DEFAULT 'pending',
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order items table (T2-008)
-- unit_price = price at time of purchase
CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTO_INCREMENT,
  order_id   INTEGER NOT NULL,
  book_id    INTEGER NOT NULL,
  quantity   INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (book_id)  REFERENCES books(id)
);

-- Inventory history table (tracks stock changes with reason)
CREATE TABLE IF NOT EXISTS inventory_history (
  id              INTEGER PRIMARY KEY AUTO_INCREMENT,
  book_id         INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason          TEXT,
  timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

-- Sample books for testing
INSERT IGNORE INTO books (isbn, title, author, price, quantity_in_stock, category, description) VALUES
  ('978-0-06-112008-4', 'To Kill a Mockingbird', 'Harper Lee',          12.99, 25, 'Fiction',    'A classic of American literature.'),
  ('978-0-7432-7356-5', '1984',                  'George Orwell',       10.99, 30, 'Fiction',    'A dystopian social science fiction novel.'),
  ('978-0-14-028329-7', 'The Great Gatsby',       'F. Scott Fitzgerald',  9.99, 20, 'Classic',   'A novel about the American Dream.'),
  ('978-0-7432-7357-2', 'Dune',                  'Frank Herbert',       14.99, 15, 'Sci-Fi',     'An epic science fiction saga.');

-- Sample customer for testing
INSERT IGNORE INTO customers (name, email, phone, city, state) VALUES
  ('Test Customer', 'test@example.com', '555-0100', 'Salt Lake City', 'UT');
