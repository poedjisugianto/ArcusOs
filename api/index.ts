import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import midtransClient from "midtrans-client";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Supabase for backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
// Prefer Service Role Key for backend to bypass RLS for administrative tasks
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper to get global settings from Supabase
const getGlobalSettings = async () => {
  if (!supabase) {
    console.warn("Supabase not initialized (missing environment variables)");
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('system_configs')
      .select('data')
      .eq('id', 'global')
      .single();
    
    if (error) throw error;
    return data.data;
  } catch (err) {
    console.error("Failed to fetch global settings:", err);
    return null;
  }
};

// Initialize Midtrans Snap with dynamic keys
const getSnapInstance = async () => {
  const settings = await getGlobalSettings();
  
  const serverKey = (settings?.paymentGatewayServerKey || process.env.MIDTRANS_SERVER_KEY || "").trim();
  const clientKey = (settings?.paymentGatewayClientKey || process.env.MIDTRANS_CLIENT_KEY || "").trim();
  const isProduction = settings?.paymentGatewayIsProduction === true || settings?.paymentGatewayIsProduction === "true" || process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) {
    console.warn("Midtrans Server Key is missing. Falling back to simulation mode.");
    return null;
  }

  try {
    return new midtransClient.Snap({
      isProduction,
      serverKey,
      clientKey
    });
  } catch (err) {
    console.error("Failed to initialize Midtrans Snap:", err);
    return null;
  }
};

// API Route for sending Email OTP via Nodemailer
// Cache the transporter outside the request handler for serverless efficiency
let cachedTransporter: any = null;

app.post("/api/send-email-otp", async (req, res) => {
  const { email, message, subject } = req.body;
  
  const missingVars = [];
  if (!process.env.SMTP_HOST) missingVars.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missingVars.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missingVars.push("SMTP_PASS");
  
  if (missingVars.length > 0) {
    console.log(`[SIMULATION] Email to ${email} with subject "${subject || 'OTP'}": ${message}`);
    return res.json({ 
      success: true, 
      message: "Email dikirim (SIMULASI - Kredensial SMTP belum dikonfigurasi)",
      isSimulated: true 
    });
  }

  if (!cachedTransporter) {
    const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const smtpUser = (process.env.SMTP_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || "").trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    
    // Auto-detect secure based on port if SMTP_SECURE is not explicitly "true" or "false"
    let smtpSecure = process.env.SMTP_SECURE === "true";
    if (!process.env.SMTP_SECURE) {
      smtpSecure = smtpPort === 465;
    }

    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Add timeout to prevent hanging
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
    });
  }

  const startTime = Date.now();
  try {
    console.log(`[EMAIL START] Attempting to send email to ${email}...`);
    await cachedTransporter.sendMail({
      from: `"ARCUS Archery System" <${(process.env.SMTP_USER || "").trim()}>`,
      to: email,
      subject: subject || "Kode OTP Anda",
      text: message,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #f8fafc; color: #1e293b;">
          <div style="background-color: #0f172a; padding: 20px; border-radius: 20px 20px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-style: italic; letter-spacing: -0.05em;">ARCUS DIGITAL</h1>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 20px 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #0f172a; margin-top: 0;">Keamanan Akun</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">${message.replace(/\n/g, '<br>')}</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
              &copy; ${new Date().getFullYear()} Arcus Digital Archery System. Pesan ini dikirim secara otomatis, harap jangan membalas.
            </div>
          </div>
        </div>
      `,
    });

    const duration = Date.now() - startTime;
    console.log(`[EMAIL SUCCESS] OTP sent to ${email} in ${duration}ms`);
    res.json({ success: true, message: "OTP sent to email", duration });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[EMAIL API ERROR] Failed after ${duration}ms:`, {
      code: error.code,
      command: error.command,
      response: error.response,
      message: error.message
    });
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Gagal mengirim email. Silakan cek kredensial SMTP di dashboard Vercel." 
    });
  }
});

// API Route for sending WhatsApp OTP via Fonnte
app.post("/api/send-otp", async (req, res) => {
  const { phone, message } = req.body;
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    return res.status(500).json({ success: false, message: "WhatsApp token missing." });
  }

  try {
    const response = await axios.post(
      "https://api.fonnte.com/send",
      { target: phone, message: message, countryCode: "62" },
      { headers: { Authorization: token } }
    );

    if (response.data.status) {
      res.json({ success: true, data: response.data });
    } else {
      res.status(400).json({ success: false, data: response.data });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to send WhatsApp", error: error.message });
  }
});

// Payment Database (In-memory for simulation)
const simulatedPayments: Record<string, { status: string, amount: number }> = {};

// API Route for creating a payment transaction
app.post("/api/payment/create", async (req, res) => {
  const { amount, method, provider, customerDetails, itemDetails } = req.body;
  const orderId = "ARCUS-" + Date.now() + "-" + Math.random().toString(36).toUpperCase().substr(2, 4);
  
  console.log(`[PAYMENT] Initiating ${amount} via ${method} using provider: ${provider}`);

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
  }

  const snap = await getSnapInstance();

  // If Midtrans is configured, use it
  if (snap) {
    try {
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        credit_card: {
          secure: true
        },
        customer_details: customerDetails,
        item_details: itemDetails
      };

      // @ts-ignore
      const transaction = await snap.createTransaction(parameter);
      
      // Store locally for status tracking if needed
      simulatedPayments[orderId] = { status: "PENDING", amount };

      return res.json({ 
        success: true, 
        transactionId: orderId,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        isReal: true
      });
    } catch (error: any) {
      console.error("Midtrans Error:", error);
      // Detailed error for debugging if it's unauthorized
      if (error.message?.includes("401")) {
        return res.status(500).json({ 
          success: false, 
          message: "Midtrans Auth Error: Server Key tidak valid atau salah mode (Sandbox/Production).",
          error: error.message 
        });
      }
      return res.status(500).json({ success: false, message: "Gagal membuat transaksi Midtrans", error: error.message });
    }
  }
  
  // Fallback to simulation
  simulatedPayments[orderId] = { status: "PENDING", amount };
  
  // Simulate automatic success after 10 seconds
  setTimeout(() => {
    if (simulatedPayments[orderId]) {
      simulatedPayments[orderId].status = "PAID";
      console.log(`[SIMULATION] Webhook received for ${orderId}: Status updated to PAID`);
    }
  }, 10000);

  res.json({ 
    success: true, 
    transactionId: orderId,
    qrData: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + orderId,
    message: "Transaction created (SIMULATED). Will auto-confirm in 10s.",
    isReal: false
  });
});

// API Route for checking payment status (Polling)
app.get("/api/payment/status/:id", async (req, res) => {
  const orderId = req.params.id;
  
  const snap = await getSnapInstance() as any;
  const serverKey = snap.apiConfig.serverKey;

  // If Midtrans is configured, check real status
  if (serverKey) {
    try {
      const statusResponse = await snap.transaction.status(orderId);
      let status = "PENDING";
      
      if (statusResponse.transaction_status === 'settlement' || statusResponse.transaction_status === 'capture') {
        status = "PAID";
      } else if (statusResponse.transaction_status === 'deny' || statusResponse.transaction_status === 'cancel' || statusResponse.transaction_status === 'expire') {
        status = "FAILED";
      }

      return res.json({ success: true, status, midtransStatus: statusResponse.transaction_status });
    } catch (error: any) {
      // If not found in Midtrans, check simulation
      const payment = simulatedPayments[orderId];
      if (payment) {
        return res.json({ success: true, status: payment.status });
      }
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
  }

  const payment = simulatedPayments[orderId];
  if (!payment) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }
  
  res.json({ success: true, status: payment.status });
});

// Webhook Endpoint for Midtrans
app.get("/api/payment/webhook", (req, res) => {
  res.send("Webhook Arcus aktif! Gunakan metode POST untuk mengirim notifikasi pembayaran.");
});

app.post("/api/payment/webhook", async (req, res) => {
  const notification = req.body;
  
  // Midtrans validation pings often don't contain order_id or use dummy data
  // We return 200 OK so Midtrans can verify the endpoint is reachable
  if (!notification || !notification.order_id) {
    console.log("[WEBHOOK] Received empty or invalid notification, acknowledging for validation.");
    return res.status(200).json({ success: true, message: "Endpoint reached" });
  }

  console.log(`[WEBHOOK] Received update for ${notification.order_id}: ${notification.transaction_status}`);
  
  const snap = await getSnapInstance() as any;
  const serverKey = snap.apiConfig.serverKey;

  if (!serverKey) {
    console.warn("[WEBHOOK] Midtrans Server Key not configured. Skipping verification.");
    return res.status(200).json({ success: true, message: "Simulated Webhook" });
  }

  try {
    const statusResponse = await snap.transaction.notification(notification);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    if (transactionStatus == 'capture') {
      if (fraudStatus == 'challenge') {
        // TODO: handle fraud challenge
      } else if (fraudStatus == 'accept') {
        if (simulatedPayments[orderId]) simulatedPayments[orderId].status = "PAID";
      }
    } else if (transactionStatus == 'settlement') {
      if (simulatedPayments[orderId]) simulatedPayments[orderId].status = "PAID";
    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
      if (simulatedPayments[orderId]) simulatedPayments[orderId].status = "FAILED";
    } else if (transactionStatus == 'pending') {
      if (simulatedPayments[orderId]) simulatedPayments[orderId].status = "PENDING";
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[WEBHOOK ERROR] Critical error during processing:", error);
    // CRITICAL: Always return 200 to Midtrans even on error to stop retry-loop and pass validation
    res.status(200).json({ success: true, message: "Acknowledged with internal log" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ARCUS API is running" });
});

// API Route for registering a participant (Online Registration)
// This bypasses RLS using the backend supabase client
app.post("/api/register-participant", async (req, res) => {
  const { eventId, registration, archer } = req.body;

  if (!supabase) {
    return res.status(500).json({ success: false, message: "Supabase not initialized on backend" });
  }

  try {
    // 1. Get current event data
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('data, user_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      throw new Error(fetchError?.message || "Event not found");
    }

    const eventData = event.data;
    
    // 2. Update registrations and archers arrays
    const updatedRegistrations = [...(eventData.registrations || []), registration];
    const updatedArchers = [...(eventData.archers || []), archer];

    console.log(`[REGISTRATION] Event: ${eventId}, New Total Archers: ${updatedArchers.length}`);

    const updatedData = {
      ...eventData,
      registrations: updatedRegistrations,
      archers: updatedArchers
    };

    // 3. Save back to Supabase
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        data: updatedData, 
        status: eventData.status || 'ACTIVE',
        updated_at: new Date().toISOString() 
      })
      .eq('id', eventId);

    if (updateError) {
      throw updateError;
    }

    res.json({ 
      success: true, 
      message: "Participant registered successfully",
      count: updatedArchers.length
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
