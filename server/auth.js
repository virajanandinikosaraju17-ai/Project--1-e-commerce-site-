'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'novacart-dev-secret-change-me';
const TOKEN_TTL = '7d';
const COOKIE_NAME = 'novacart_token';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_TTL
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function readToken(req) {
  const header = req.get('authorization');
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies ? req.cookies[COOKIE_NAME] : null;
}

/** Attaches req.user when a valid token is present, otherwise leaves it null. */
function optionalAuth(req, _res, next) {
  const token = readToken(req);
  req.user = null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

/** Rejects the request with 401 when no valid token is present. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'You need to sign in to do that.' });
  next();
}

module.exports = { signToken, setAuthCookie, clearAuthCookie, optionalAuth, requireAuth, COOKIE_NAME };
