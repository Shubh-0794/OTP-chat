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

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const phone = body?.user?.phone || body?.phone;
    const otpIdentifier = body?.sms?.otp || body?.otp || 'Verification Code';

    if (!phone) {
      return res.status(400).json({ error: 'Phone number missing in webhook payload' });
    }

    console.log(`[Supabase Webhook Received] Triggered for phone: ${phone}`);

    // Forward message to Open-WA Gateway if configured
    if (process.env.OPEN_WA_SERVER_URL) {
      const waRes = await fetch(`${process.env.OPEN_WA_SERVER_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message: `Your verification code reference is: *${otpIdentifier.slice(0, 8)}...*. Do not share this code.`
        })
      });

      if (!waRes.ok) {
        const errData = await waRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Open-WA gateway rejected webhook message');
      }

      return res.status(200).json({ success: true, message: 'Webhook processed and dispatched to WhatsApp' });
    } else {
      console.log(`[Webhook Simulation] Phone: ${phone}, OTP Hash/Ref: ${otpIdentifier}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received successfully (OPEN_WA_SERVER_URL not configured for live dispatch)' 
      });
    }
  } catch (err) {
    console.error('Webhook ingress error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
