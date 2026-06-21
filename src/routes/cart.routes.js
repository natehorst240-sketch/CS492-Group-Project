// Sprint 2 — T2-002 and T2-003: Shopping-cart routes

const express = require('express');
const cart = require('../sprint-2/T2-002_cart-api');

const router = express.Router();

router.get('/:userId', async (request, response, next) => {
  try {
    response.json(await cart.getCart(request.params.userId));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const { user_id, book_id, quantity } = request.body;
    response.status(201).json(await cart.addToCart(user_id, book_id, quantity));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    response.json(await cart.updateCartItem(request.params.id, request.body.quantity));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    response.json(await cart.removeCartItem(request.params.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

