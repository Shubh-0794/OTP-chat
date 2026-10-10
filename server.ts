import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

async function createServer() {
  const app = express();
  app.use(express.json());

  // Mock implementation of Netlify functions for local AI Studio preview
  app.post('/.netlify/functions/send-otp', async (req, res) => {
    try {
      const { handler } = await import('./netlify/functions/send-otp.js');
      const result: any = await handler({
        httpMethod: 'POST',
        body: JSON.stringify(req.body)
      });
      res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error (Mock Netlify Function)' });
    }
  });

  app.post('/.netlify/functions/verify-otp', async (req, res) => {
    try {
      const { handler } = await import('./netlify/functions/verify-otp.js');
      const result: any = await handler({
        httpMethod: 'POST',
        body: JSON.stringify(req.body)
      });
      res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error (Mock Netlify Function)' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

createServer();
