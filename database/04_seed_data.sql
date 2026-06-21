INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
VALUES (1, 'demo@acereads.local', 'DEMO_ONLY_NOT_A_REAL_HASH', 'Demo', 'Customer', 'customer');

INSERT IGNORE INTO books (isbn, title, author, category, format, price, quantity, shelf_location)
VALUES
  ('9780140328721', 'Matilda', 'Roald Dahl', 'Children', 'Paperback', 8.99, 12, 'A-01'),
  ('9780061120084', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', 'Paperback', 12.99, 8, 'B-04');

