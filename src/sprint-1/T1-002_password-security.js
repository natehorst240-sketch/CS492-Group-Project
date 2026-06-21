// Sprint 1 — T1-002: Password encryption and validation

const bcrypt = require('bcryptjs');

function validatePassword(password) {
  const valid = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  return valid.test(password)
    ? null
    : 'Password must be 8+ characters with 1 uppercase letter, 1 number, and 1 special character';
}

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = { validatePassword, hashPassword, comparePassword };
