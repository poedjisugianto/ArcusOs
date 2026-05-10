import express from "express";
import cors from "cors";
import axios from "axios";
import nodemailer from "nodemailer";
import midtransClient from "midtrans-client";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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
if (!getApps().length) {
  try {
    // Priority: use explicit projectId from config to avoid using compute project defaults
    const options: any = {};
    if (firebaseConfig.projectId) {
      options.projectId = firebaseConfig.projectId;
      console.log("[FIREBASE-ADMIN] Using projectId from config:", options.projectId);
    }
    
    adminApp = initializeApp(options);
    console.log("[FIREBASE-ADMIN] App initialized.");
  } catch (err) {
    console.error("[FIREBASE-ADMIN] Initialization error:", err);
  }
} else {
  adminApp = getApps()[0];
}

// Determine actual project ID being used
const effectiveProjectId = adminApp?.options?.projectId || firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;

// Ensure we use the correct database ID
const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

const db = (adminApp) 
  ? (dbId ? getFirestore(adminApp, dbId) : getFirestore(adminApp))
  : null;

if (db) {
  console.log("[FIREBASE-ADMIN] Firestore connected. Project:", effectiveProjectId, "Database:", dbId || "(default)");
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

// Internal Caching for Global Settings
let cachedGlobalSettings: any = null;
let lastGlobalSettingsUpdate = 0;
const SETTINGS_CACHE_TTL = 60 * 1000; // 60 seconds

// Helper to get global settings from Firestore
const getGlobalSettings = async () => {
  const now = Date.now();
  if (cachedGlobalSettings && (now - lastGlobalSettingsUpdate < SETTINGS_CACHE_TTL)) {
    return cachedGlobalSettings;
  }

  try {
    let settings = null;
    // 1. Try Admin SDK first
    if (db) {
      try {
        const docSnap = await db.collection('systemConfigs').doc('global').get();
        if (docSnap.exists) {
          const data = docSnap.data();
          settings = data?.data || data;
        }
      } catch (adminErr: any) {
        console.warn("[ADMIN-SDK] Settings fetch error:", adminErr.message);
      }
    }

    // 2. Fallback to REST API if Admin failed or returned nothing
    if (!settings) {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/documents/systemConfigs/global?key=${firebaseConfig.apiKey}`;
      try {
        const response = await axios.get(url, { timeout: 4000 });
        if (response.data && response.data.fields) {
          const transformed = transformRestFields(response.data.fields);
          settings = transformed.data || transformed;
        }
      } catch (restErr: any) {
         console.warn("[REST-API] Settings fetch error:", restErr.response?.data || restErr.message);
      }
    }

    if (settings) {
      cachedGlobalSettings = settings;
      lastGlobalSettingsUpdate = now;
      return settings;
    }
  } catch (err: any) {
    console.warn("Global Settings fetch failed entirely:", err.message);
  }
  return cachedGlobalSettings; // Return stale cache if fetch fails
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
  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  
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

  let attempts = 0;
  const maxAttempts = 2;
  const startTime = Date.now();
  
  while (attempts < maxAttempts) {
    attempts++;
    
    if (!cachedTransporter) {
      const smtpUser = (process.env.SMTP_USER || "").trim();
      const smtpPass = (process.env.SMTP_PASS || "").trim();
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      
      console.log(`[EMAIL-CONFIG] Using Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser.replace(/(.{4}).*@/, "$1***@")}`);
      
      const isGmail = smtpHost.includes("gmail.com");

      if (isGmail && smtpPass.length !== 16 && smtpPass.length !== 0) {
         console.warn("[EMAIL-WARN] SMTP_PASS for Gmail does not look like a 16-character App Password. Login will likely fail.");
      }

      let smtpSecure = process.env.SMTP_SECURE === "true";
      if (!process.env.SMTP_SECURE) {
        smtpSecure = smtpPort === 465;
      }

      const transportConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000, 
        greetingTimeout: 10000,
      };

      // Use Gmail service if explicitly using Gmail for better reliability
      if (isGmail) {
        transportConfig.service = 'gmail';
        // When using service: 'gmail', host/port/secure are handled internally by nodemailer
      }

      cachedTransporter = nodemailer.createTransport(transportConfig);
    }

    try {
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
        let errorMessage = error.message;
        
        // Specially handle Gmail Auth failures (535)
        if (errorMessage.includes("535") || errorMessage.includes("authentication failed")) {
          if (smtpHost.includes("gmail.com")) {
            errorMessage = "Autentikasi Gmail Gagal. Jika Anda menggunakan Gmail, Anda WAJIB menggunakan 'App Password' (bukan password akun utama) karena Google memblokir akses login aplikasi standar. Silakan buat App Password di Google Account Anda.";
          }
        }

        console.error(`[EMAIL API ERROR] Failed after ${duration}ms (${attempts} attempts):`, {
          code: error.code,
          command: error.command,
          response: error.response,
          message: error.message,
          suggestion: errorMessage
        });

        return res.status(500).json({ 
          success: false, 
          error: error.message,
          message: errorMessage || "Gagal mengirim email setelah beberapa kali mencoba. Silakan cek kredensial SMTP." 
        });
      }
      console.warn(`[EMAIL RETRY] Attempt ${attempts} failed: ${error.message}. Retrying in 1s...`);
      // If it's a login error, clear the cached transporter to force re-creation with potentially updated env vars
      if (error.message.includes("535") || error.code === "EAUTH") {
        cachedTransporter = null;
      }
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

app.get("/api/smtp-diagnostic", (req, res) => {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const port = process.env.SMTP_PORT || "587";
  
  res.json({
    success: true,
    config: {
      host: host || "NOT SET",
      user: user ? `${user.substring(0, 4)}***@${user.split('@')[1] || 'domain'}` : "NOT SET",
      port: port,
      passStatus: pass ? `SET (${pass.length} chars)` : "NOT SET",
      isGmail: host.includes("gmail.com"),
      passLooksLikeAppPassword: host.includes("gmail.com") ? pass.length === 16 : null
    }
  });
});

// Health check and DB Diagnostics
app.get("/api/health", async (req, res) => {
  const dbStatus = db ? "connected" : "not initialized";
  res.json({ 
    status: "ok", 
    message: "ARCUS API is running",
    db: dbStatus,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
  });
});

app.get("/api/db-test", async (req, res) => {
  if (!db) return res.status(500).json({ error: "DB not initialized" });
  try {
    // Try to list collections to see if we have broad access
    const collections = await db.listCollections();
    const collectionIds = collections.map((c: any) => c.id);
    
    // Try to get a specific document
    const doc = await db.collection('test').doc('connection').get();
    
    return res.json({ 
      success: true, 
      exists: doc.exists, 
      path: doc.ref.path,
      collections: collectionIds,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
    });
  } catch (err: any) {
    console.error("[DB-TEST] Full Error Object:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
  }
});

// --- PRODUCTION API FOR EVENT DISCOVERY ---
// Fetch public events directly from Firestore without "faking" or stale caching.
app.get("/api/public-events", async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=5'); // Sangat singkat agar data segar

  if (!db) return res.status(500).json({ error: "Cloud Server tidak aktif" });

  try {
    // Ambil langsung dari Firestore
    const snapshot = await db.collection('events').limit(100).get();

    const events: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const eventData = data.data || data;
      const status = (data.status || eventData.status || (eventData.settings?.status) || 'ACTIVE').toString().toUpperCase();
      
      if (status !== 'DELETED' && status !== 'DRAFT') {
         // Kirim struktur yang sudah dinormalisasi (flat) agar frontend tidak bingung
         const regCount = data.registrationCount || data.data?.registrationCount || 0;
         events.push({
           ...(data.data || data), 
           id: doc.id,
           registrationCount: regCount,
           status: ['PUBLISHED', 'READY', 'OPEN', 'ONGOING', 'STARTED', 'ACTIVE'].includes(status) ? 'ACTIVE' : status,
           createdAt: data.createdAt || eventData.createdAt || new Date().toISOString()
         });
      }
    });

    return res.json({ 
       success: true, 
       events, 
       source: 'live-cloud',
       timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[LIVE-FETCH-ERROR]:", err.message);
    res.status(500).json({ error: "Gagal mengambil data cloud." });
  }
});

// API Route for registering participants (Online Registration)
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
    
    // Use a batch to write submissions AND update the main event metadata
    const batch = db.batch();
    
    // 1. Write each registration and participant to the subcollection
    registrations.forEach((reg: any, index: number) => {
      const subRef = eventRef.collection('submissions').doc(reg.id || `reg_${Date.now()}_${index}`);
      batch.set(subRef, {
        ...reg,
        archerData: archers.find((a: any) => a.id === reg.id) || null,
        officialData: (officials || []).find((o: any) => o.id === reg.id) || null,
        serverTimestamp: new Date().toISOString()
      }, { merge: true });
    });

    // 2. Update the main event metadata (counts and timestamps)
    // We don't push the full array to the main document to avoid the 1MB limit!
    // Instead, we just store the count and the last updated time.
    batch.update(eventRef, {
      "registrationCount": FieldValue.increment(registrations.length),
      "data.registrationCount": FieldValue.increment(registrations.length),
      "data.lastRegistrationAt": new Date().toISOString(),
      "lastRegistrationAt": new Date().toISOString(),
      "updatedAt": new Date().toISOString()
    });

    await batch.commit();

    // Invalidate memory cache for this event so subsequent fetches get fresh data
    if (eventDetailsCache[eventId]) {
      delete eventDetailsCache[eventId];
    }

    res.json({ 
      success: true, 
      message: `${registrations.length} participant(s) registered successfully in cloud subcollections`,
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

// Memory cache for individual event details to save quota on live views
const eventDetailsCache: Record<string, { data: any, timestamp: number }> = {};
const DETAIL_CACHE_TTL = 5 * 1000; // 5 detik (Sangat segar, hampir real-time)

app.get("/api/event-details/:id", async (req, res) => {
  const eventId = req.params.id;
  const now = Date.now();

  // Kembalikan cache hanya jika di bawah 5 detik (untuk meredam benturan ratusan user di detik yang sama)
  if (eventDetailsCache[eventId] && (now - eventDetailsCache[eventId].timestamp < DETAIL_CACHE_TTL)) {
    return res.json({ success: true, data: eventDetailsCache[eventId].data, source: 'cache' });
  }

  if (!db) return res.status(500).json({ error: "Sistem Cloud tidak siap" });

  try {
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) return res.status(404).json({ error: "Turnamen dihapus atau tidak ada" });
    
    const data = eventDoc.data();
    const eventData = data.data || data;

    // Ambil data archer dan skor secara LIVE
    const [submissionsSnap, shardsSnap] = await Promise.all([
      db.collection('events').doc(eventId).collection('submissions').limit(5000).get(),
      db.collection('events').doc(eventId).collection('shards').limit(1000).get()
    ]);

    const submissions: any[] = [];
    submissionsSnap.forEach((d: any) => submissions.push({ id: d.id, ...d.data() }));

    const shards: any[] = [];
    shardsSnap.forEach((d: any) => shards.push({ id: d.id, ...d.data() }));

    const fullData = {
      event: { id: eventDoc.id, ...data, data: eventData },
      submissions,
      shards
    };

    // Update Cache
    eventDetailsCache[eventId] = { data: fullData, timestamp: now };

    res.json({ success: true, data: fullData, source: 'live' });
  } catch (err: any) {
    console.error(`[DETAIL-FETCH-ERROR] ${eventId}:`, err.message);
    
    // Fallback on error
    if (eventDetailsCache[eventId]) {
      return res.json({ success: true, data: eventDetailsCache[eventId].data, source: 'error-fallback' });
    }
    
    res.status(500).json({ error: "Sistem sibuk, silakan coba lagi." });
  }
});

// Final cleanup: No background preheating
export default app;
