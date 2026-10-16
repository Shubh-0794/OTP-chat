export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { phone, otp, token } = req.body || {};
  const code = otp || token;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and OTP required' });
  phone = String(phone).replace(/\s/g, '');
  if (!phone.startsWith('+')) phone = `+${phone}`;

  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'sms', phone, token: code }),
  });

  if (!r.ok) return res.status(400).json({ success: false, error: 'Incorrect OTP' });
  return res.status(200).json({ success: true, verified: true });
}
