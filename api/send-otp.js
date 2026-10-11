import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { phone } = body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  // 1. Generate 6-digit numeric OTP & SHA-256 hash
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5-minute expiry

  // 2. Mark any older active OTPs for this phone as expired/used
  await supabase
    .from('otp_verifications')
    .update({ is_verified: true })
    .eq('phone_number', phone)
    .eq('is_verified', false);

  // 3. Store hash in Supabase
  const { error: dbError } = await supabase.from('otp_verifications').insert({
    phone_number: phone,
    otp_hash: otpHash,
    expires_at: expiresAt,
  });

  if (dbError) {
    console.error('Supabase write error:', dbError);
    return res.status(500).json({ error: `Supabase database error: ${dbError.message || 'Write failed'}` });
  }

  // 4. Send message via Open-WA Gateway
  if (process.env.OPEN_WA_SERVER_URL) {
    try {
      const waRes = await fetch(`${process.env.OPEN_WA_SERVER_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message: `Your verification code is: *${otp}*. It expires in 5 minutes. Do not share this code.`
        })
      });

      if (!waRes.ok) {
        const errorData = await waRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gateway rejected the request');
      }

      return res.status(200).json({ success: true, message: 'OTP sent successfully via WhatsApp' });
    } catch (err) {
      console.error('WhatsApp delivery error:', err);
      return res.status(502).json({ error: `WhatsApp delivery service unreachable: ${err.message}` });
    }
  } else {
    console.log(`[OTP GENERATED] Code for ${phone}: ${otp}`);
    return res.status(200).json({
      success: true,
      message: `OTP stored in Supabase! (Test code: ${otp} - set OPEN_WA_SERVER_URL for live WhatsApp)`
    });
  }
}
