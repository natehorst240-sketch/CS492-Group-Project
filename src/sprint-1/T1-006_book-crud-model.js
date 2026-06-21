// Sprint 1 — T1-006: Book inventory CRUD backend
// Existing team code, connected to the shared database module.

const db = require('../db');

async function getBooks({ search, category, format } = {}) {
  let query = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ? OR isbn = ?)';
    params.push(`%${search}%`, `%${search}%`, search);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (format) {
    query += ' AND format = ?';
    params.push(format);
  }

  query += ' ORDER BY title ASC';
  const [rows] = await db.query(query, params);
  return rows;
}

async function getBookById(id) {
  const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [id]);
  return rows[0] || null;
}

async function addBook(data) {
  const { isbn, title, author, category, format, price, quantity, shelf_location, reorder_threshold } = data;
  if (!isbn || !title || !author || price === undefined) {
    throw new Error('isbn, title, author, and price are required');
  }

  const [result] = await db.query(
    `INSERT INTO books
      (isbn, title, author, category, format, price, quantity, shelf_location, reorder_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [isbn, title, author, category || null, format || null, Number(price), Number(quantity) || 0, shelf_location || null, Number(reorder_threshold) || 5]
  );
  return { id: result.insertId, message: 'Book added' };
}

async function updateBook(id, data) {
  const { title, author, category, format, price, quantity, shelf_location, reorder_threshold } = data;
  if (!title || !author || price === undefined) {
    throw new Error('title, author, and price are required');
  }

  const [result] = await db.query(
    `UPDATE books SET title=?, author=?, category=?, format=?, price=?,
      quantity=?, shelf_location=?, reorder_threshold=? WHERE id=?`,
    [title, author, category || null, format || null, Number(price), Number(quantity) || 0, shelf_location || null, Number(reorder_threshold) || 5, id]
  );
  if (result.affectedRows === 0) throw new Error('Book not found');
  return { message: 'Book updated' };
}

async function deleteBook(id) {
  const [result] = await db.query('UPDATE books SET quantity = 0 WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Book not found');
  return { message: 'Book marked as out of stock' };
}

module.exports = { getBooks, getBookById, addBook, updateBook, deleteBook };

