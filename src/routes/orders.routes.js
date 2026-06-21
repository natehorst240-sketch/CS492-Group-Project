const express = require('express');
const orders = require('../sprint-2/T2-008_order-management-backend');

const router = express.Router();

router.get('/', async (request, response, next) => {
  try {
    if (!request.query.user_id) {
      return response.status(400).json({ error: 'user_id is required' });
    }
    response.json(await orders.getOrdersByUser(request.query.user_id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const order = await orders.getOrderById(request.params.id);
    if (!order) return response.status(404).json({ error: 'Order not found' });
    response.json(order);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const { user_id, shipping_address, items } = request.body;
    response.status(201).json(await orders.createOrder(user_id, shipping_address, items));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (request, response, next) => {
  try {
    response.json(await orders.updateOrderStatus(request.params.id, request.body.status));
  } catch (error) {
    next(error);
  }
});

router.use((error, _request, response, _next) => {
  console.error(error);
  response.status(400).json({ error: error.message || 'Order request failed' });
});

module.exports = router;

