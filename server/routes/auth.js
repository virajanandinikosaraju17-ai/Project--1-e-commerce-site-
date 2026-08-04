'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/register — create an account and sign the user in. */
router.post('/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);

  const user = { id: Number(lastInsertRowid), name, email };
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user });
});

/** POST /api/auth/login — verify credentials and issue a session cookie. */
router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const user = { id: row.id, name: row.name, email: row.email };
  setAuthCookie(res, signToken(user));
  res.json({ user });
});

/** POST /api/auth/logout — clear the session cookie. */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/** GET /api/auth/me — current user, or null when signed out. */
router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const row = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: row || null });
});

/** GET /api/auth/profile — profile plus a small order summary. */
router.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  const stats = db
    .prepare('SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent FROM orders WHERE user_id = ?')
    .get(req.user.id);
  res.json({ user, stats });
});

module.exports = router;
