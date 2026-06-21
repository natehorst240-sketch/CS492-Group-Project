// Sprint 2 — T2-002: Shopping-cart API service

const db = require('../db');

async function getCart(userId) {
  const [items] = await db.query(
    `SELECT ci.id, ci.user_id, ci.book_id, ci.quantity,
            b.title, b.author, b.price, b.quantity AS available_quantity
     FROM cart_items ci
     JOIN books b ON ci.book_id = b.id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  return items;
}

async function addToCart(userId, bookId, quantity = 1) {
  const amount = Number(quantity);
  if (!userId || !bookId || !Number.isInteger(amount) || amount < 1) {
    throw new Error('Valid user_id, book_id, and quantity are required');
  }

  const [books] = await db.query(
    'SELECT id, quantity FROM books WHERE id = ?',
    [bookId]
  );
  if (!books[0]) throw new Error('Book not found');

  await db.query(
    `INSERT INTO cart_items (user_id, book_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [userId, bookId, amount]
  );
  return { message: 'Added to cart' };
}

async function updateCartItem(itemId, quantity) {
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('Quantity must be a positive whole number');
  }
  const [result] = await db.query(
    'UPDATE cart_items SET quantity = ? WHERE id = ?',
    [amount, itemId]
  );
  if (!result.affectedRows) throw new Error('Cart item not found');
  return { message: 'Cart updated' };
}

async function removeCartItem(itemId) {
  const [result] = await db.query('DELETE FROM cart_items WHERE id = ?', [itemId]);
  if (!result.affectedRows) throw new Error('Cart item not found');
  return { message: 'Removed from cart' };
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem };
