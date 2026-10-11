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
  const { phone, otp } = body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  const submittedHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

  // Fetch most recent active verification record
  const { data: record, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone_number', phone)
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !record) {
    return res.status(400).json({ error: 'No active OTP request found.' });
  }

  // Rate limit: Max 5 failed attempts
  if (record.attempts >= 5) {
    return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
  }

  // Check expiration
  if (new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This OTP has expired.' });
  }

  // Verify hash
  if (record.otp_hash !== submittedHash) {
    await supabase
      .from('otp_verifications')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    return res.status(401).json({ error: 'Incorrect verification code.' });
  }

  // Mark as verified
  await supabase
    .from('otp_verifications')
    .update({ is_verified: true })
    .eq('id', record.id);

  return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
}
