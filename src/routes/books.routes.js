const express = require('express');
const books = require('../sprint-1/T1-006_book-crud-model');

const router = express.Router();

router.get('/', async (request, response, next) => {
  try {
    response.json(await books.getBooks(request.query));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const book = await books.getBookById(request.params.id);
    if (!book) return response.status(404).json({ error: 'Book not found' });
    response.json(book);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    response.status(201).json(await books.addBook(request.body));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    response.json(await books.updateBook(request.params.id, request.body));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    response.json(await books.deleteBook(request.params.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

