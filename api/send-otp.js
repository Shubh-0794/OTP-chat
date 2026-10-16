export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  phone = String(phone).replace(/\s/g, '');
  if (!phone.startsWith('+')) phone = `+${phone}`;

  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone }),
  });

  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json({ error: data.msg || data.message || 'Failed to send OTP' });
  }
  return res.status(200).json({ success: true });
}
