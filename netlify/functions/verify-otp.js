import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { phone, otp } = JSON.parse(event.body || '{}');
  if (!phone || !otp) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Phone and OTP are required' }) };
  }

  const submittedHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');

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
    return { statusCode: 400, body: JSON.stringify({ error: 'No active OTP request found.' }) };
  }

  // Rate limit: Max 5 failed attempts
  if (record.attempts >= 5) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }) };
  }

  // Check expiration
  if (new Date(record.expires_at) < new Date()) {
    return { statusCode: 410, body: JSON.stringify({ error: 'This OTP has expired.' }) };
  }

  // Verify hash
  if (record.otp_hash !== submittedHash) {
    await supabase
      .from('otp_verifications')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);

    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect verification code.' }) };
  }

  // Mark as verified
  await supabase
    .from('otp_verifications')
    .update({ is_verified: true })
    .eq('id', record.id);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, message: 'OTP verified successfully!' })
  };
};
