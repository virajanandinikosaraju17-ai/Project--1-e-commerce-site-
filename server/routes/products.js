'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

/** GET /api/products?search=&category= — product listing with optional filters. */
router.get('/', (req, res) => {
  const search = (req.query.search || '').trim();
  const category = (req.query.category || '').trim();

  let sql = 'SELECT * FROM products WHERE 1 = 1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category && category.toLowerCase() !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY id';

  res.json({ products: db.prepare(sql).all(...params) });
});

/** GET /api/products/categories — distinct category list for the filter bar. */
router.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json({ categories: rows.map((r) => r.category) });
});

/** GET /api/products/:idOrSlug — single product detail. */
router.get('/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const product = /^\d+$/.test(idOrSlug)
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(Number(idOrSlug))
    : db.prepare('SELECT * FROM products WHERE slug = ?').get(idOrSlug);

  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const related = db
    .prepare('SELECT * FROM products WHERE category = ? AND id != ? ORDER BY RANDOM() LIMIT 3')
    .all(product.category, product.id);

  res.json({ product, related });
});

module.exports = router;
