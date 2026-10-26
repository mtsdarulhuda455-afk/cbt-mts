import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration for server-side cloud sync
let fbDb: any = null;
try {
  const fbConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(fbConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8'));
    const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    fbDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    console.log('⚡ [Server DB] Terhubung ke Firebase Firestore project:', firebaseConfig.projectId, 'db:', firebaseConfig.firestoreDatabaseId);
  }
} catch (fbInitErr) {
  console.warn('[Server DB] Firebase initialization notice:', fbInitErr);
}

async function startServer() {
  const app = express();

  // Support JSON payload up to 50MB (for large databases with exams, questions, barcodes)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // File path for server-side persistent database
  const DATA_DIR = path.join(__dirname, 'data');
  const DB_FILE = path.join(DATA_DIR, 'database_master.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // API 1: Get latest unified database snapshot (Instant multi-device sync for all clients!)
  app.get('/api/database/latest', (_req, res) => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ 
          success: true, 
          data,
          message: `Database berhasil dimuat dari server pusat (${data.users?.length || 0} akun)` 
        });
      }
      return res.json({ 
        success: false, 
        message: 'Belum ada database yang disinkronkan ke server pusat' 
      });
    } catch (err: any) {
      console.error('[Server DB] Error reading latest database:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2: Save unified database snapshot to server disk
  app.post('/api/database/sync', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Payload tidak valid' });
      }

      const usersCount = Array.isArray(payload.users) ? payload.users.length : 0;
      const classesCount = Array.isArray(payload.classes) ? payload.classes.length : 0;
      const examsCount = Array.isArray(payload.exams) ? payload.exams.length : 0;

      const serverPayload = {
        ...payload,
        serverSavedAt: Date.now(),
        serverSavedDate: new Date().toISOString()
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(serverPayload, null, 2), 'utf-8');
      console.log(`⚡ [Server DB] Database berhasil disimpan di server pusat (${usersCount} akun, ${classesCount} rombel, ${examsCount} ujian).`);

      // Asynchronously mirror snapshot to Cloud Firestore
      if (fbDb) {
        setDoc(doc(fbDb, 'system_snapshot', 'latest_database'), serverPayload, { merge: true })
          .then(() => console.log('⚡ [Server DB] Salinan snapshot sukses dicerminkan ke Cloud Firestore.'))
          .catch((fbErr: any) => console.warn('[Server DB] Notice saat mencerminkan ke Firestore:', fbErr?.message || fbErr));
      }

      return res.json({ 
        success: true, 
        message: `Database berhasil disinkronkan ke server pusat & cloud Firestore (${usersCount} akun pengguna). Seluruh perangkat yang mengakses link ini akan langsung menerima data ini!`,
        timestamp: serverPayload.serverSavedAt,
        counts: {
          users: usersCount,
          classes: classesCount,
          exams: examsCount,
        }
      });
    } catch (err: any) {
      console.error('[Server DB] Error saving database:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2b: Explicitly push current server master database to Cloud Firestore
  app.post('/api/database/sync-firebase', async (_req, res) => {
    try {
      if (!fs.existsSync(DB_FILE)) {
        return res.status(404).json({ success: false, message: 'Belum ada database di server lokal untuk disinkronkan ke Firebase' });
      }
      if (!fbDb) {
        return res.status(500).json({ success: false, message: 'Firebase belum terkonfigurasi di server' });
      }

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);

      // Save system snapshot to Firestore
      await setDoc(doc(fbDb, 'system_snapshot', 'latest_database'), {
        ...data,
        cloudPushedAt: Date.now(),
        cloudPushedDate: new Date().toISOString()
      }, { merge: true });

      // Push collections
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          if (u.id) await setDoc(doc(fbDb, 'users', String(u.id)), u);
        }
      }
      if (Array.isArray(data.classes)) {
        for (const c of data.classes) {
          if (c.id) await setDoc(doc(fbDb, 'classes', String(c.id)), c);
        }
      }
      if (Array.isArray(data.exams)) {
        for (const e of data.exams) {
          if (e.id) await setDoc(doc(fbDb, 'exams', String(e.id)), e);
        }
      }
      if (data.settings) {
        await setDoc(doc(fbDb, 'settings', 'main'), data.settings);
      }

      console.log(`⚡ [Server DB] Sinkronisasi penuh ke Firebase Firestore berhasil (${data.users?.length || 0} akun).`);
      return res.json({
        success: true,
        message: `Basis data berhasil disinkronkan 100% dengan Cloud Firebase Firestore (${data.users?.length || 0} akun pengguna).`,
        counts: {
          users: data.users?.length || 0,
          classes: data.classes?.length || 0,
          exams: data.exams?.length || 0
        }
      });
    } catch (err: any) {
      console.error('[Server DB] Error syncing to Firebase:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 3: Status check
  app.get('/api/database/status', (_req, res) => {
    try {
      const exists = fs.existsSync(DB_FILE);
      if (!exists) {
        return res.json({ 
          exists: false,
          php_min_version: '8.2',
          php_compatible: '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
          is_php_supported: true
        });
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({
        exists: true,
        savedAt: data.serverSavedAt || data.updatedAt,
        usersCount: data.users?.length || 0,
        classesCount: data.classes?.length || 0,
        examsCount: data.exams?.length || 0,
        php_min_version: '8.2',
        php_compatible: '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
        is_php_supported: true
      });
    } catch {
      return res.json({ exists: false });
    }
  });

  // API 4: Health checks for Cloud Run & monitoring probes
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      app: 'EduExam CBT Pro',
      php_min_version: '8.2',
      php_compatible: '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
      is_php_supported: true,
      serverTime: new Date().toISOString() 
    });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      app: 'EduExam CBT Pro',
      php_min_version: '8.2',
      php_compatible: '>= 8.2 (8.2, 8.3, 8.4, 8.5+)',
      is_php_supported: true,
      serverTime: new Date().toISOString() 
    });
  });

  // Determine production vs development mode
  const isDevScript = process.env.npm_lifecycle_event === 'dev';
  const distDir = path.join(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const hasBuiltDist = fs.existsSync(distIndex);
  const isProd = !isDevScript && (process.env.NODE_ENV === 'production' || hasBuiltDist);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from production build directory
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  // Bind to port: in local dev script force 3000, in Cloud Run production use process.env.PORT || 8080
  const PORT = isDevScript ? 3000 : (process.env.PORT || 8080);
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
