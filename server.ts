import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

async function createServer() {
  const app = express();
  app.use(express.json());

  // API Handlers for local AI Studio preview (supports both /api and /.netlify/functions)
  const handleSendOtp = async (req: express.Request, res: express.Response) => {
    try {
      const { default: handler } = await import('./api/send-otp.js');
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const handleVerifyOtp = async (req: express.Request, res: express.Response) => {
    try {
      const { default: handler } = await import('./api/verify-otp.js');
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  app.post('/api/send-otp', handleSendOtp);
  app.post('/.netlify/functions/send-otp', handleSendOtp);
  app.post('/api/verify-otp', handleVerifyOtp);
  app.post('/.netlify/functions/verify-otp', handleVerifyOtp);

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
