import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initDB, run, get, all } from './src/server/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const PORT = 3000;

async function startServer() {
  await initDB();
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
      res.status(201).json({ message: 'User created' });
    } catch (error) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email } });
  });

  // --- Appliance Routes ---
  app.get('/api/appliances', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const appliances = await all('SELECT * FROM appliances WHERE userId = ?', [userId]);
    res.json(appliances);
  });

  app.post('/api/appliances', authenticateToken, async (req, res) => {
    const { name, powerWatts, usageHours } = req.body;
    const userId = req.user.id;
    await run('INSERT INTO appliances (userId, name, powerWatts, usageHours) VALUES (?, ?, ?, ?)', 
      [userId, name, powerWatts, usageHours]);
    res.sendStatus(201);
  });

  app.delete('/api/appliances/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    await run('DELETE FROM appliances WHERE id = ? AND userId = ?', [id, userId]);
    res.sendStatus(204);
  });

  // --- AI Route ---
  app.post('/api/ai/suggestions', authenticateToken, async (req, res) => {
    try {
      const { appliances } = req.body;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API Key not configured' });
      }

      const applianceData = appliances.map((a) => `${a.name}: ${a.powerWatts}W used for ${a.usageHours}h/day`).join(', ');
      const prompt = `Based on these household appliances: ${applianceData}. Provide 3 concise and actionable tips to reduce electricity consumption and lower the monthly bill. Return only the tips as a markdown list.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions available.';
      res.json({ suggestions: text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI Analysis failed' });
    }
  });

  // --- History Routes ---
  app.get('/api/history', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const history = await all('SELECT * FROM electricity_records WHERE userId = ? ORDER BY id DESC', [userId]);
    res.json(history);
  });

  app.post('/api/history', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { month, totalKwh, estimatedCost } = req.body;
    await run('INSERT INTO electricity_records (userId, month, totalKwh, estimatedCost) VALUES (?, ?, ?, ?)',
      [userId, month, totalKwh, estimatedCost]);
    res.sendStatus(201);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
