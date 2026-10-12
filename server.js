var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/send-otp.js
var send_otp_exports = {};
__export(send_otp_exports, {
  default: () => handler
});
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { phone } = body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1e3).toISOString();
    const { error: updateError } = await supabase.from("otp_verifications").update({ is_verified: true }).eq("phone_number", phone).eq("is_verified", false);
    if (updateError) {
      console.error("Supabase update error:", updateError);
    }
    const { error: dbError } = await supabase.from("otp_verifications").insert({
      phone_number: phone,
      otp_hash: otpHash,
      expires_at: expiresAt
    });
    if (dbError) {
      console.error("Supabase write error details:", dbError);
      const errorMsg = [dbError.message, dbError.details, dbError.hint].filter(Boolean).join(" - ");
      return res.status(500).json({ error: `Supabase write error: ${errorMsg || JSON.stringify(dbError)}` });
    }
    if (process.env.OPEN_WA_SERVER_URL) {
      try {
        const waRes = await fetch(`${process.env.OPEN_WA_SERVER_URL}/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            message: `Your verification code is: *${otp}*. It expires in 5 minutes. Do not share this code.`
          })
        });
        if (!waRes.ok) {
          const errorData = await waRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Gateway rejected the request");
        }
        return res.status(200).json({ success: true, message: "OTP sent successfully via WhatsApp" });
      } catch (err) {
        console.error("WhatsApp delivery error:", err);
        return res.status(502).json({ error: `WhatsApp delivery service unreachable: ${err.message}` });
      }
    } else {
      console.log(`[OTP GENERATED] Code for ${phone}: ${otp}`);
      return res.status(200).json({
        success: true,
        message: `OTP stored in Supabase! (Test code: ${otp} - set OPEN_WA_SERVER_URL for live WhatsApp)`
      });
    }
  } catch (err) {
    console.error("Handler execution error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
var supabaseUrl, supabaseKey, supabase;
var init_send_otp = __esm({
  "api/send-otp.js"() {
    supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "placeholder";
    supabase = createClient(supabaseUrl, supabaseKey);
  }
});

// api/verify-otp.js
var verify_otp_exports = {};
__export(verify_otp_exports, {
  default: () => handler2
});
import { createClient as createClient2 } from "@supabase/supabase-js";
import crypto2 from "crypto";
async function handler2(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { phone, otp } = body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP are required" });
    }
    const submittedHash = crypto2.createHash("sha256").update(String(otp).trim()).digest("hex");
    const { data: record, error } = await supabase2.from("otp_verifications").select("*").eq("phone_number", phone).eq("is_verified", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) {
      console.error("Supabase fetch error:", error);
      const errorMsg = [error.message, error.details, error.hint].filter(Boolean).join(" - ");
      return res.status(500).json({ error: `Supabase database error: ${errorMsg}` });
    }
    if (!record) {
      return res.status(400).json({ error: "No active OTP request found." });
    }
    if (record.attempts >= 5) {
      return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP." });
    }
    if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) {
      return res.status(410).json({ error: "This OTP has expired." });
    }
    if (record.otp_hash !== submittedHash) {
      await supabase2.from("otp_verifications").update({ attempts: record.attempts + 1 }).eq("id", record.id);
      return res.status(401).json({ error: "Incorrect verification code." });
    }
    await supabase2.from("otp_verifications").update({ is_verified: true }).eq("id", record.id);
    return res.status(200).json({ success: true, message: "OTP verified successfully!" });
  } catch (err) {
    console.error("Verify handler error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
var supabaseUrl2, supabaseKey2, supabase2;
var init_verify_otp = __esm({
  "api/verify-otp.js"() {
    supabaseUrl2 = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
    supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "placeholder";
    supabase2 = createClient2(supabaseUrl2, supabaseKey2);
  }
});

// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
var PORT = 3e3;
async function createServer() {
  const app = express();
  app.use(express.json());
  const handleSendOtp = async (req, res) => {
    try {
      const { default: handler3 } = await Promise.resolve().then(() => (init_send_otp(), send_otp_exports));
      await handler3(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  const handleVerifyOtp = async (req, res) => {
    try {
      const { default: handler3 } = await Promise.resolve().then(() => (init_verify_otp(), verify_otp_exports));
      await handler3(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  app.post("/api/send-otp", handleSendOtp);
  app.post("/.netlify/functions/send-otp", handleSendOtp);
  app.post("/api/verify-otp", handleVerifyOtp);
  app.post("/.netlify/functions/verify-otp", handleVerifyOtp);
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
createServer();
