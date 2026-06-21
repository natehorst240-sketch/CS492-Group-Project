// Sprint 2 — T2-008: Order Management System Backend
// Existing team code, connected to the shared database module.

const db = require('../db');

async function getOrdersByUser(userId) {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function getOrderById(orderId) {
  const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  const order = orderRows[0];
  if (!order) return null;

  const [itemRows] = await db.query(
    `SELECT oi.*, b.title, b.author
     FROM order_items oi
     JOIN books b ON oi.book_id = b.id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  order.items = itemRows;
  return order;
}

async function createOrder(userId, shippingAddress, items) {
  if (!userId || !items || items.length === 0) {
    throw new Error('user_id and at least one item are required');
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const [orderResult] = await db.query(
    'INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (?, ?, ?)',
    [userId, total, shippingAddress || null]
  );

  for (const item of items) {
    await db.query(
      `INSERT INTO order_items
        (order_id, book_id, quantity, price_at_purchase)
       VALUES (?, ?, ?, ?)`,
      [orderResult.insertId, item.book_id, item.quantity, item.price]
    );
  }

  return { id: orderResult.insertId, message: 'Order created' };
}

async function updateOrderStatus(orderId, status) {
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) throw new Error('Invalid status');

  const [result] = await db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId]
  );
  if (result.affectedRows === 0) throw new Error('Order not found');
  return { message: 'Order status updated' };
}

module.exports = { getOrdersByUser, getOrderById, createOrder, updateOrderStatus };

