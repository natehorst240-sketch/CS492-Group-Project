// Sprint 1 — T1-003: Login and session management

const jwt = require('jsonwebtoken');
const db = require('../db');
const { comparePassword } = require('./T1-002_password-security');

async function loginUser({ email, password }) {
  if (!email || !password) throw new Error('Email and password are required');

  const [users] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [email.trim().toLowerCase()]
  );
  const user = users[0];
  if (!user) throw new Error('Invalid credentials');
  if (user.account_locked) throw new Error('Account locked');

  const validPassword = await comparePassword(password, user.password_hash);
  if (!validPassword) {
    const attempts = Number(user.failed_login_attempts || 0) + 1;
    const locked = attempts >= 5;
    await db.query(
      `UPDATE users
       SET failed_login_attempts = ?, account_locked = ?
       WHERE id = ?`,
      [attempts, locked, user.id]
    );
    throw new Error(locked ? 'Account locked after 5 failed attempts' : 'Invalid credentials');
  }

  await db.query(
    'UPDATE users SET failed_login_attempts = 0 WHERE id = ?',
    [user.id]
  );

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
  };
}

module.exports = { loginUser };
