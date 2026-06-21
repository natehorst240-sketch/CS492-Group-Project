// Sprint 1 — T1-001: User registration
// Adapted from the team implementation guide.

const db = require('../db');
const { validatePassword, hashPassword } = require('./T1-002_password-security');

async function registerUser({ email, password, first_name, last_name }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(password);

  try {
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES (?, ?, ?, ?)`,
      [email.trim().toLowerCase(), passwordHash, first_name || null, last_name || null]
    );
    return { message: 'User registered successfully', userId: result.insertId };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new Error('Email is already registered');
    throw error;
  }
}

module.exports = { registerUser };
