// Sprint 1 — T1-001 through T1-004: Authentication routes

const express = require('express');
const { registerUser } = require('../sprint-1/T1-001_user-registration');
const { loginUser } = require('../sprint-1/T1-003_login-sessions');

const router = express.Router();

router.post('/register', async (request, response, next) => {
  try {
    response.status(201).json(await registerUser(request.body));
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    response.json(await loginUser(request.body));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

