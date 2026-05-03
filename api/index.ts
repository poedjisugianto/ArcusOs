import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import midtransClient from "midtrans-client";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Load Firebase Config safely
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error("Failed to load firebase-applet-config.json:", err);
}

// Initialize Firebase Admin lazily
let adminApp: any = null;
if (!getApps().length && firebaseConfig.projectId) {
  try {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    }, "admin-app"); // Use a named app to avoid collisions
    console.log("[FIREBASE-ADMIN] App initialized for project:", firebaseConfig.projectId);
  } catch (err) {
    console.error("[FIREBASE-ADMIN] Initialization error:", err);
  }
} else {
  adminApp = getApps().find(a => a.name === "admin-app") || getApps()[0];
}

// Note: databaseId needs to be specified correctly
// Using the correct pattern for secondary databases in admin SDK
const db = (adminApp && firebaseConfig.projectId) 
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || "(default)") 
  : (firebaseConfig.projectId ? getFirestore() : null);

if (db) {
  console.log("[FIREBASE-ADMIN] Firestore connected to database:", firebaseConfig.firestoreDatabaseId || "(default)");
}

// Transformation helper for Firestore REST API
function transformRestFields(fields: any) {
  const result: any = {};
  if (!fields) return result;
  
  for (const [key, val] of Object.entries(fields)) {
    const value = val as any;
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.mapValue !== undefined) result[key] = transformRestFields(value.mapValue.fields);
    else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        if (v.mapValue !== undefined) return transformRestFields(v.mapValue.fields);
        return v;
      });
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Hard Fallback Data removed to ensure only real user data is shown.
const HARD_FALLBACK_API_RESPONSE: any[] = [];

// Helper to get global settings from Firestore
const getGlobalSettings = async () => {
  try {
    // Try REST first as it's often more reliable in these sandboxed environments for settings
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/documents/systemConfigs/global?key=${firebaseConfig.apiKey}`;
    try {
      const response = await axios.get(url, { timeout: 4000 });
      if (response.data && response.data.fields) {
        const transformed = transformRestFields(response.data.fields);
        return transformed.data;
      }
    } catch (restErr) {
       // fallback silently to admin
    }

    if (db) {
       const docSnap = await db.collection('systemConfigs').doc('global').get();
       if (docSnap.exists) {
         return docSnap.data()?.data;
       }
    }
  } catch (err) {
    console.warn("Global Settings fetch failed:", (err as Error).message);
  }
  return null;
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
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[EMAIL ATTEMPT ${attempts}] Sending to ${email}...`);
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
      console.log(`[EMAIL SUCCESS] OTP sent to ${email} in ${duration}ms (Attempt ${attempts})`);
      return res.json({ success: true, message: "OTP sent to email", duration, attempts });
    } catch (error: any) {
      if (attempts >= maxAttempts) {
        const duration = Date.now() - startTime;
        console.error(`[EMAIL API ERROR] Failed after ${duration}ms (${attempts} attempts):`, {
          code: error.code,
          command: error.command,
          response: error.response,
          message: error.message
        });
        return res.status(500).json({ 
          success: false, 
          error: error.message,
          message: "Gagal mengirim email setelah beberapa kali mencoba. Silakan cek kredensial SMTP." 
        });
      }
      console.warn(`[EMAIL RETRY] Attempt ${attempts} failed: ${error.message}. Retrying in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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

// Global Cache for Public Events with High Resiliency
const EVENT_CACHE_FILE = path.join(process.cwd(), 'cached_public_events.json');
let cachedPublicEvents: any[] | null = null;
let lastPublicEventsUpdate = 0;
const PUBLIC_EVENTS_CACHE_TTL = 30 * 1000; // 30 Seconds cache for better responsiveness

// Initialize cache from disk on startup
try {
  if (fs.existsSync(EVENT_CACHE_FILE)) {
    const savedData = JSON.parse(fs.readFileSync(EVENT_CACHE_FILE, 'utf8'));
    cachedPublicEvents = savedData.events;
    lastPublicEventsUpdate = savedData.timestamp;
    console.log("[CACHE] Initialized from disk: " + (cachedPublicEvents?.length || 0) + " events.");
  }
} catch (err) {
  console.warn("Failed to load cached events from disk:", (err as Error).message);
}

app.get("/api/public-events", async (req, res) => {
  try {
    // 1. Return Cache Immediately if Fresh (10 mins)
    const now = Date.now();
    if (cachedPublicEvents && (now - lastPublicEventsUpdate < 600000)) {
      console.log(`[API] Serving fresh cache (${cachedPublicEvents.length} events)`);
      return res.json({ success: true, events: cachedPublicEvents, source: 'cache' });
    }

    let events: any[] = [];
    let fetchSuccessful = false;
    
    // Primary: REST API 
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/documents/events?key=${firebaseConfig.apiKey}&pageSize=100`;
    try {
      const response = await axios.get(url, { timeout: 10000 });
      if (response.data && response.data.documents) {
        response.data.documents.forEach((doc: any) => {
          const dataFromRest = transformRestFields(doc.fields);
          if (dataFromRest) {
            const id = doc.name.split('/').pop();
            const status = (dataFromRest.status || dataFromRest.data?.status || 'ACTIVE').toUpperCase();
            events.push({ id, ...dataFromRest });
          }
        });
        fetchSuccessful = true;
      }
    } catch (err: any) {
      console.error("[REST-API] Live Fetch Error:", err.message);
    }

    // Secondary: Admin SDK Fallback
    if (!fetchSuccessful && db) {
      try {
        const snapshot = await db.collection('events').limit(100).get();
        console.log(`[ADMIN-SDK] Found ${snapshot.size} documents in events collection.`);
        snapshot.forEach((doc: any) => {
          const d = doc.data();
          const status = (d.status || d.data?.status || 'ACTIVE').toUpperCase();
          console.log(`[ADMIN-SDK] Checking Doc: ${doc.id}, Status: ${status}`);
          events.push({ id: doc.id, ...d });
        });
        fetchSuccessful = true;
      } catch (err: any) {
        console.error("[ADMIN-SDK] Live Fetch Error:", err.message);
      }
    }

    if (events.length === 0 && cachedPublicEvents && cachedPublicEvents.length > 0) {
      console.log(`[API] Live fetch returned 0 events, serving ${cachedPublicEvents.length} events from cache.`);
      return res.json({
        success: true,
        events: cachedPublicEvents,
        source: 'cache'
      });
    }

    if (events.length > 0) {
      const finalEvents = events.map(e => {
        const baseData = e.data || e;
        // Search EXHAUSTIVELY for a tournament name
        const tournamentName = baseData.settings?.tournamentName || 
                              (baseData.data && baseData.data.settings?.tournamentName) ||
                              e.settings?.tournamentName || 
                              baseData.tournamentName || 
                              baseData.name || 
                              baseData.title || 
                              "Tournament Arcus";
        
        const status = (e.status || baseData.status || 'ACTIVE').toUpperCase();
        
        return {
          id: e.id,
          status: status,
          createdAt: e.createdAt || baseData.createdAt || new Date().toISOString(),
          data: {
            ...baseData,
            settings: {
              ...(baseData.settings || {}),
              tournamentName: baseData.settings?.tournamentName || tournamentName
            }
          }
        };
      });

      // Update Cache
      try {
        const cacheData = { events: finalEvents, timestamp: Date.now() };
        fs.writeFileSync(EVENT_CACHE_FILE, JSON.stringify(cacheData));
        cachedPublicEvents = finalEvents;
        lastPublicEventsUpdate = cacheData.timestamp;
        console.log(`[CACHE] Updated disk cache with ${finalEvents.length} events.`);
      } catch (cacheErr) {
        console.warn("[CACHE] Failed to write to disk:", cacheErr);
      }

      return res.json({ 
        success: true, 
        events: finalEvents, 
        source: 'database'
      });
    }

    // If database returned nothing but we HAVE cache, use it
    if (cachedPublicEvents && cachedPublicEvents.length > 0) {
      console.log(`[API] Serving ${cachedPublicEvents.length} events from fallback cache (DB empty/down).`);
      return res.json({
        success: true,
        events: cachedPublicEvents,
        source: 'cache'
      });
    }

    return res.json({
      success: true,
      events: [],
      source: 'empty'
    });
  } catch (error: any) {
    console.error("Critical Public Events Failure:", error.message);
    
    // Last resort: try to serve from cache on error
    if (cachedPublicEvents && cachedPublicEvents.length > 0) {
      console.log(`[API-ERROR-FALLBACK] Serving ${cachedPublicEvents.length} events from cache due to crash.`);
      return res.json({
        success: true,
        events: cachedPublicEvents,
        source: 'error-cache'
      });
    }
    
    res.status(500).json({ success: false, error: "Database temporarily unavailable" });
  }
});

// API Route for registering participants (Online Registration - Supports Multi-register/Collective)
app.post("/api/register-participant", async (req, res) => {
  const { eventId, registrations, archers, officials = [] } = req.body;

  if (!db) {
    return res.status(500).json({ success: false, message: "Firestore not initialized on backend" });
  }

  if (!eventId || !registrations || !archers || !Array.isArray(registrations) || !Array.isArray(archers)) {
    return res.status(400).json({ success: false, message: "Missing required registration data or invalid format" });
  }

  try {
    const eventRef = db.collection('events').doc(eventId);
    
    await db.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }

      const eventRecord = eventSnap.data()!;
      const eventData = eventRecord.data || {};
      
      // Update registrations, archers, and officials arrays
      const updatedRegistrations = [...(eventData.registrations || []), ...registrations];
      const updatedArchers = [...(eventData.archers || []), ...archers];
      const updatedOfficials = [...(eventData.officials || []), ...officials];

      console.log(`[REGISTRATION-BATCH] Event: ${eventId}, Added: ${registrations.length}, Archers: ${archers.length}, Officials: ${officials.length}`);

      const updatedData = {
        ...eventData,
        registrations: updatedRegistrations,
        archers: updatedArchers,
        officials: updatedOfficials
      };

      transaction.update(eventRef, { 
        data: updatedData, 
        updatedAt: new Date().toISOString() 
      });
    });

    res.json({ 
      success: true, 
      message: `${registrations.length} participant(s) registered successfully`,
      count: registrations.length
    });
  } catch (error: any) {
    console.error("Batch Registration Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Gagal memproses pendaftaran masal. Silahkan coba lagi." 
    });
  }
});

export default app;
