const { create } = require('@open-wa/wa-automate');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let waClient = null;

// Initialize Open-WA client
create({
  sessionId: "OTP_SERVICE",
  multiDevice: true,
  authTimeout: 60,
  blockCrashLogs: true,
  headless: true,
  qrTimeout: 0,
}).then((client) => {
  waClient = client;
  console.log("WhatsApp automated client ready!");
}).catch((err) => console.error("Error launching WA client:", err));

app.post('/send-otp', async (req, res) => {
  const { phone, message } = req.body;

  if (!waClient) {
    return res.status(503).json({ error: "WhatsApp service starting up or unavailable" });
  }

  // Format standard E.164 without '+' into WhatsApp chat ID format
  const sanitizedPhone = phone.replace(/[^0-9]/g, '');
  const chatId = `${sanitizedPhone}@c.us`;

  try {
    const isRegistered = await waClient.checkNumberStatus(chatId);
    if (!isRegistered.canReceiveMessage) {
      return res.status(400).json({ error: "Phone number is not registered on WhatsApp" });
    }

    await waClient.sendText(chatId, message);
    return res.json({ success: true, message: "WhatsApp message delivered" });
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return res.status(500).json({ error: "Failed to dispatch message" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Open-WA server running on port ${PORT}`));
