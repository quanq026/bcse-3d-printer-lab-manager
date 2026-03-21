import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { mkdirSync, existsSync, copyFileSync, readdirSync, statSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger, httpLogger } from './logger.js';
import {
  validate,
  RegisterSchema, LoginSchema,
  CreateJobSchema, PatchJobSchema, PatchUserSchema, UpdateManagedPasswordSchema, ChangeOwnPasswordSchema,
  UpdatePricingSchema, UpdateServiceFeesSchema, PostMessageSchema,
} from './validation.js';

// ─── Load .env file (no dotenv dependency) ─────────────────────────────────
try {
  const envPath = path.join(process.cwd(), '.env');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, ''); // strip optional quotes
      if (!(key in process.env)) process.env[key] = val; // don't overwrite existing env
    }
  }
} catch { /* .env is optional */ }

const JWT_SECRET = process.env.JWT_SECRET || 'bcse-vju-3dlab-secret-2025';
const PORT = parseInt(process.env.PORT || '3000');
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const IS_PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY || (IS_PROD ? '1' : 'loopback');
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@vju.ac.vn';
const SEED_MOD_EMAIL = process.env.SEED_MOD_EMAIL || 'mod@vju.ac.vn';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@2024';
const SEED_MOD_PASSWORD = process.env.SEED_MOD_PASSWORD || 'Mod@2024';
const SYNC_SEED_PASSWORDS = ['1', 'true', 'yes'].includes((process.env.SYNC_SEED_PASSWORDS || '').toLowerCase());

// Fail fast in production if JWT secret is default (insecure)
if (IS_PROD && JWT_SECRET === 'bcse-vju-3dlab-secret-2025') {
  logger.error('JWT_SECRET must be set to a secure random value in production. Exiting.');
  process.exit(1);
}

const VJU_DOMAINS = ['st.vju.ac.vn', 'vju.ac.vn'];
function isVjuEmail(email: string) {
  const lower = email.toLowerCase().trim();
  return VJU_DOMAINS.some(d => lower.endsWith('@' + d));
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Database ──────────────────────────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'lab.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT,
    role TEXT NOT NULL DEFAULT 'Student',
    phone TEXT,
    supervisor TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    build_volume TEXT NOT NULL,
    supported_materials TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    queue_length INTEGER NOT NULL DEFAULT 0,
    next_available TEXT,
    location TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    has_ams INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    job_name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL DEFAULT '',
    estimated_time TEXT,
    estimated_grams INTEGER NOT NULL DEFAULT 0,
    actual_grams INTEGER,
    material_type TEXT NOT NULL,
    color TEXT NOT NULL,
    material_source TEXT NOT NULL,
    printer_id TEXT,
    printer_name TEXT,
    slot_time TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    cost REAL NOT NULL DEFAULT 0,
    rejection_reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS filament_inventory (
    id TEXT PRIMARY KEY,
    material TEXT NOT NULL,
    color TEXT NOT NULL,
    remaining_grams REAL NOT NULL DEFAULT 1000,
    threshold REAL NOT NULL DEFAULT 200,
    location TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,
    material TEXT NOT NULL UNIQUE,
    price_per_gram REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    job_id TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS service_fees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lab_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migrations
try { db.exec(`ALTER TABLE printers ADD COLUMN location TEXT NOT NULL DEFAULT ''`); } catch { }
try { db.exec(`ALTER TABLE printers ADD COLUMN image_url TEXT NOT NULL DEFAULT ''`); } catch { }
try { db.exec(`ALTER TABLE printers ADD COLUMN has_ams INTEGER NOT NULL DEFAULT 0`); } catch { }
try { db.exec(`ALTER TABLE filament_inventory ADD COLUMN brand TEXT NOT NULL DEFAULT ''`); } catch { }
try { db.exec(`ALTER TABLE filament_inventory ADD COLUMN area TEXT NOT NULL DEFAULT 'My Dinh'`); } catch { }
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN revision_note TEXT`); } catch { }
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN brand TEXT`); } catch { }
try { db.exec(`ALTER TABLE users ADD COLUMN ban_reason TEXT`); } catch { }
try { db.exec(`ALTER TABLE users ADD COLUMN ban_until TEXT`); } catch { }
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN print_mode TEXT NOT NULL DEFAULT 'self'`); } catch { }
try { db.exec(`ALTER TABLE service_fees ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`); } catch { }
try { db.prepare(`UPDATE service_fees SET amount=100, description='Phí dịch vụ in hộ (đ/gram)' WHERE name='service_fee' AND amount=20000`).run(); } catch { }
db.prepare(`INSERT OR IGNORE INTO lab_settings (key,value) VALUES ('terms_content',?)`).run('');
db.prepare(`INSERT OR IGNORE INTO lab_settings (key,value) VALUES ('require_approval','0')`).run();

// Performance indexes
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_email_verif_email ON email_verifications(email)`); } catch { }
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_print_jobs_user_id ON print_jobs(user_id)`); } catch { }
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status)`); } catch { }
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)`); } catch { }

// ─── Seed ──────────────────────────────────────────────────────────────────
function seedIfEmpty() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, 10);
    db.prepare(`INSERT INTO users (id,email,password_hash,full_name,role,status,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), SEED_ADMIN_EMAIL, hash, 'Admin BCSE Lab', 'Admin', 'active', new Date().toISOString());
    const modHash = bcrypt.hashSync(SEED_MOD_PASSWORD, 10);
    db.prepare(`INSERT INTO users (id,email,password_hash,full_name,role,status,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), SEED_MOD_EMAIL, modHash, 'Moderator Lab', 'Moderator', 'active', new Date().toISOString());
  }
  const printerCount = (db.prepare('SELECT COUNT(*) as c FROM printers').get() as any).c;
  if (printerCount === 0) {
    const printers = [
      { id: 'p1', name: 'Bambu Lab A1', build_volume: '256 x 256 x 256 mm', mats: JSON.stringify(['PLA', 'PETG', 'TPU']), loc: 'Mỹ Đình', img: '/images/bambuA1.jpg', ams: 1 },
      { id: 'p2', name: 'Bambu Lab X1 Carbon', build_volume: '256 x 256 x 256 mm', mats: JSON.stringify(['PLA', 'PETG', 'TPU', 'ABS']), loc: 'Hòa Lạc', img: '/images/bambuX1Carbon.png', ams: 0 },
      { id: 'p3', name: 'Creality Ender 3 V3', build_volume: '220 x 220 x 270 mm', mats: JSON.stringify(['PLA', 'PETG', 'TPU']), loc: 'Hòa Lạc', img: '/images/Ender-3S1.jpg', ams: 0 },
    ];
    const stmt = db.prepare(`INSERT INTO printers (id,name,build_volume,supported_materials,status,queue_length,location,image_url,has_ams) VALUES (?,?,?,?,'Available',0,?,?,?)`);
    printers.forEach(p => stmt.run(p.id, p.name, p.build_volume, p.mats, p.loc, p.img, p.ams));
  }
  const invCount = (db.prepare('SELECT COUNT(*) as c FROM filament_inventory').get() as any).c;
  if (invCount === 0) {
    const items = [
      { id: 'S-001', mat: 'PLA', color: 'Trắng', g: 850, t: 200, loc: 'Tủ A1', brand: 'Bambu', area: 'My Dinh' },
      { id: 'S-002', mat: 'PLA', color: 'Đen', g: 120, t: 200, loc: 'Tủ A1', brand: 'Bambu', area: 'My Dinh' },
      { id: 'S-003', mat: 'PETG', color: 'Xanh dương', g: 450, t: 150, loc: 'Tủ B2', brand: 'Elegoo', area: 'Hoa Lac' },
      { id: 'S-004', mat: 'PLA', color: 'Đỏ', g: 0, t: 200, loc: 'Tủ A2', brand: 'Bambu', area: 'My Dinh' },
      { id: 'S-005', mat: 'PLA', color: 'Xám', g: 920, t: 200, loc: 'Tủ A1', brand: 'Generic', area: 'Hoa Lac' },
    ];
    const stmt = db.prepare(`INSERT INTO filament_inventory (id,material,color,remaining_grams,threshold,location,brand,area) VALUES (?,?,?,?,?,?,?,?)`);
    items.forEach(i => stmt.run(i.id, i.mat, i.color, i.g, i.t, i.loc, i.brand, i.area));
  }
  const priceCount = (db.prepare('SELECT COUNT(*) as c FROM pricing_rules').get() as any).c;
  if (priceCount === 0) {
    [['PLA', 1000], ['PETG', 1200], ['TPU', 1500], ['ABS', 1300]].forEach(([m, p]) =>
      db.prepare(`INSERT INTO pricing_rules (id,material,price_per_gram) VALUES (?,?,?)`).run(randomUUID(), m, p)
    );
  }
  const feeCount = (db.prepare('SELECT COUNT(*) as c FROM service_fees').get() as any).c;
  if (feeCount === 0) {
    [
      ['setup_fee', 'Phí khởi tạo Job', 0, 'Áp dụng cho mỗi yêu cầu in'],
      ['rush_fee', 'Phí in nhanh', 50000, 'Ưu tiên hàng đợi'],
      ['service_fee', 'Phí in hộ', 100, 'Phí dịch vụ in hộ (đ/gram)'],
    ].forEach(([name, label, amount, desc]) =>
      db.prepare(`INSERT INTO service_fees (id,name,label,amount,description) VALUES (?,?,?,?,?)`).run(randomUUID(), name, label, amount, desc)
    );
  }
  const settingCount = (db.prepare('SELECT COUNT(*) as c FROM lab_settings').get() as any).c;
  if (settingCount === 0) {
    [
      ['contact_email', ''], ['contact_facebook', ''], ['contact_zalo', ''],
      ['guide_url', ''], ['lab_name', 'BCSE 3D Lab'],
      ['smtp_host', process.env.SMTP_HOST || ''],
      ['smtp_port', process.env.SMTP_PORT || '587'],
      ['smtp_user', process.env.SMTP_USER || ''],
      ['smtp_pass', process.env.SMTP_PASS || ''],
      ['smtp_from', process.env.SMTP_FROM || ''],
    ].forEach(([k, v]) => db.prepare('INSERT INTO lab_settings (key,value) VALUES (?,?)').run(k, v));
  }
}
seedIfEmpty();

function syncManagedAccountPassword(email: string, role: string, password: string) {
  const user = db.prepare('SELECT id,email,role FROM users WHERE email=?').get(email) as any;
  if (!user) {
    logger.warn('Managed account password sync skipped because the account was not found', { email, role });
    return;
  }
  if (user.role !== role) {
    logger.warn('Managed account password sync skipped because the role did not match', { email, expectedRole: role, actualRole: user.role });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, user.id);
  logger.info('Managed account password synced from environment', { email, role });
}

function syncSeedPasswordsFromEnv() {
  if (!SYNC_SEED_PASSWORDS) return;

  syncManagedAccountPassword(SEED_ADMIN_EMAIL, 'Admin', SEED_ADMIN_PASSWORD);
  syncManagedAccountPassword(SEED_MOD_EMAIL, 'Moderator', SEED_MOD_PASSWORD);
}

syncSeedPasswordsFromEnv();

// ─── Helpers ──────────────────────────────────────────────────────────────

// ─── Express ───────────────────────────────────────────────────────────────
const app = express();

// Trust proxy headers (needed when behind Nginx/reverse proxy)
app.set('trust proxy', TRUST_PROXY);
app.disable('x-powered-by');

// Security headers
app.use(helmet({
  // CSP disabled — React SPA with inline styles + Three.js needs careful tuning
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — only allow configured origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!IS_PROD && !origin) {
    // Allow same-origin requests in dev (e.g. curl, Postman)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Body size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// HTTP access log
app.use(httpLogger);


// ─── Rate limiters ─────────────────────────────────────────────────────────

// Global: 300 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.' },
});

// Auth endpoints: 20 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 15 phút.' },
});


const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'QuÃ¡ nhiá»u thao tÃ¡c thay Ä‘á»•i dá»¯ liá»‡u, vui lÃ²ng thá»­ láº¡i sau.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'QuÃ¡ nhiá»u láº§n táº£i file, vui lÃ²ng thá»­ láº¡i sau.' },
});

app.use('/api', globalLimiter);

// ─── Multer ────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = new Set(['.stl', '.3mf', '.gcode']);
    const allowedMimePrefixes = ['application/', 'model/', 'text/'];
    const mime = (file.mimetype || '').toLowerCase();
    const allowedMime = !mime || allowedMimePrefixes.some((prefix) => mime.startsWith(prefix));
    cb(null, allowedExts.has(ext) && allowedMime);
  }
});

const ALLOWED_JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Submitted', 'Cancelled'],
  Submitted: ['Pending review', 'Approved', 'Needs Revision', 'Rejected', 'Cancelled'],
  'Pending review': ['Approved', 'Needs Revision', 'Rejected', 'Cancelled'],
  Approved: ['Scheduled', 'Printing', 'Cancelled'],
  Scheduled: ['Printing', 'Cancelled'],
  Printing: ['Done', 'Cancelled'],
  'Needs Revision': ['Submitted', 'Cancelled'],
  Rejected: [],
  Cancelled: [],
  Done: [],
};

function canTransitionJobStatus(currentStatus: string, nextStatus: string) {
  return (ALLOWED_JOB_STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus);
}

// ─── Auth middleware ───────────────────────────────────────────────────────
interface AuthReq extends Request { user?: any; }

function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Chưa đăng nhập' }); return; }
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); }
}

function requireRole(...roles: string[]) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) { res.status(403).json({ error: 'Không có quyền truy cập' }); return; }
    next();
  };
}

function logAction(userId: string | null, userName: string | null, action: string, details?: string) {
  db.prepare(`INSERT INTO activity_logs (id,user_id,user_name,action,details,created_at) VALUES (?,?,?,?,?,?)`)
    .run(randomUUID(), userId, userName, action, details || null, new Date().toISOString());
}

function jobCode() {
  while (true) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const id = `JOB-${suffix}`;
    const existing = db.prepare('SELECT id FROM print_jobs WHERE id=?').get(id) as any;
    if (!existing) return id;
  }
}

function mapJob(j: any) {
  return { id: j.id, userId: j.user_id, userName: j.user_name, jobName: j.job_name, description: j.description, fileName: j.file_name, estimatedTime: j.estimated_time, estimatedGrams: j.estimated_grams, actualGrams: j.actual_grams, materialType: j.material_type, color: j.color, brand: j.brand, materialSource: j.material_source, printMode: j.print_mode || 'self', printerId: j.printer_id, printerName: j.printer_name, slotTime: j.slot_time, status: j.status, cost: j.cost, rejectionReason: j.rejection_reason, revisionNote: j.revision_note, notes: j.notes, createdAt: j.created_at, updatedAt: j.updated_at };
}

function toSnake(s: string) { return s.replace(/([A-Z])/g, '_$1').toLowerCase(); }

function getJobForAccess(jobId: string) {
  return db.prepare('SELECT id,user_id FROM print_jobs WHERE id=?').get(jobId) as any;
}

function canAccessJob(user: any, jobId?: string | null) {
  if (!jobId) return true;
  const job = getJobForAccess(jobId);
  if (!job) return false;
  return user.role !== 'Student' || job.user_id === user.id;
}

function canAccessFile(user: any, fileName: string) {
  const job = db.prepare('SELECT id,user_id FROM print_jobs WHERE file_name=?').get(fileName) as any;
  if (!job) return false;
  return user.role !== 'Student' || job.user_id === user.id;
}

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 as ok').get() as any;
    res.json({
      status: 'ok',
      db: row?.ok === 1 ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      ts: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});


// ─── Auth ───────────────────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, validate(RegisterSchema), (req: Request, res: Response) => {
  const { email, password, fullName, studentId, phone, supervisor } = req.body;
  if (!isVjuEmail(email)) { res.status(400).json({ error: 'Chỉ chấp nhận email VJU (@st.vju.ac.vn hoặc @vju.ac.vn)' }); return; }
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) { res.status(409).json({ error: 'Email đã được đăng ký' }); return; }


  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id,email,password_hash,full_name,student_id,phone,supervisor,role,status,created_at) VALUES (?,?,?,?,?,?,?,'Student','active',?)`)
    .run(id, email, hash, fullName, studentId || null, phone || null, supervisor || null, new Date().toISOString());
  logAction(id, fullName, 'REGISTER', `Email: ${email}`);
  logger.info('User registered', { email });
  res.json({ message: 'Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ.' });
});

app.post('/api/auth/login', authLimiter, validate(LoginSchema), (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.warn('Failed login attempt', { email, ip: req.ip });
    res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    return;
  }
  if (user.status === 'pending') { res.status(403).json({ error: 'Tài khoản đang chờ Admin phê duyệt' }); return; }
  if (user.status === 'suspended') { res.status(403).json({ error: 'Tài khoản đã bị tạm khoá' }); return; }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
  logAction(user.id, user.full_name, 'LOGIN');
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, studentId: user.student_id, phone: user.phone, supervisor: user.supervisor } });
});

app.get('/api/auth/me', requireAuth, (req: AuthReq, res: Response) => {
  const user = db.prepare('SELECT id,email,full_name,student_id,role,phone,supervisor,status FROM users WHERE id=?').get(req.user.id) as any;
  if (!user) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }
  res.json({ id: user.id, email: user.email, fullName: user.full_name, studentId: user.student_id, role: user.role, phone: user.phone, supervisor: user.supervisor, status: user.status });
});

app.post('/api/auth/change-password', writeLimiter, requireAuth, validate(ChangeOwnPasswordSchema), (req: AuthReq, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT id,password_hash,email,role,full_name FROM users WHERE id=?').get(req.user.id) as any;
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    return;
  }
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    return;
  }
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    return;
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, user.id);
  logAction(user.id, user.full_name, 'CHANGE_OWN_PASSWORD', `${user.email} (${user.role})`);
  res.json({ success: true });
});

// ─── Queue (public view) ────────────────────────────────────────────────────
app.get('/api/jobs/queue', requireAuth, (req: AuthReq, res: Response) => {
  const jobs = db.prepare(`SELECT * FROM print_jobs WHERE status IN ('Submitted','Pending review','Approved','Scheduled','Printing') ORDER BY created_at ASC`).all();
  res.json((jobs as any[]).map((j, idx) => ({ ...mapJob(j), queuePosition: idx + 1 })));
});

// ─── Jobs ───────────────────────────────────────────────────────────────────
app.get('/api/jobs', requireAuth, (req: AuthReq, res: Response) => {
  const jobs = req.user.role === 'Student'
    ? db.prepare('SELECT * FROM print_jobs WHERE user_id=? ORDER BY created_at DESC').all(req.user.id)
    : db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC').all();
  res.json((jobs as any[]).map(mapJob));
});

app.get('/api/jobs/:id', requireAuth, (req: AuthReq, res: Response) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any;
  if (!job) { res.status(404).json({ error: 'Không tìm thấy job' }); return; }
  if (req.user.role === 'Student' && job.user_id !== req.user.id) { res.status(403).json({ error: 'Không có quyền' }); return; }
  res.json(mapJob(job));
});

app.post('/api/jobs', writeLimiter, requireAuth, validate(CreateJobSchema), (req: AuthReq, res: Response) => {
  const { jobName, description, fileName, estimatedTime, estimatedGrams, materialType, color, brand, materialSource, printMode, printerId, slotTime } = req.body;
  const resolvedPrintMode = printMode === 'lab_assisted' ? 'lab_assisted' : 'self';
  const resolvedMaterialType = materialType || 'PLA';
  const resolvedColor = color || '';
  // Daily limit: students can only submit 2 jobs per day
  if (req.user.role === 'Student') {
    const todayCount = (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE user_id=? AND DATE(created_at)=DATE('now','localtime') AND status NOT IN ('Cancelled')").get(req.user.id) as any).c;
    if (todayCount >= 2) { res.status(429).json({ error: 'Bạn đã đặt tối đa 2 lệnh in trong hôm nay. Vui lòng quay lại vào ngày mai.' }); return; }
  }
  const pricing = db.prepare('SELECT price_per_gram FROM pricing_rules WHERE material=?').get(resolvedMaterialType) as any;
  const serviceFeeRow = db.prepare("SELECT amount, enabled FROM service_fees WHERE name='service_fee'").get() as any;
  const serviceFeePerGram = (serviceFeeRow?.enabled ? serviceFeeRow?.amount : 0) || 0;
  const matCostPerGram = pricing?.price_per_gram || 0;
  let cost = 0;
  if (resolvedPrintMode === 'self') {
    cost = materialSource === 'Lab' ? (estimatedGrams || 0) * matCostPerGram : 0;
  } else {
    const matCost = materialSource === 'Lab' ? (estimatedGrams || 0) * matCostPerGram : 0;
    cost = matCost + (estimatedGrams || 0) * serviceFeePerGram;
  }
  const printer = printerId ? db.prepare('SELECT name FROM printers WHERE id=?').get(printerId) as any : null;
  const initialStatus = resolvedPrintMode === 'lab_assisted' ? 'Pending review' : 'Submitted';
  const id = jobCode();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO print_jobs (id,user_id,user_name,job_name,description,file_name,estimated_time,estimated_grams,material_type,color,brand,material_source,print_mode,printer_id,printer_name,slot_time,status,cost,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, req.user.fullName, jobName, description || null, fileName || '', estimatedTime || null, estimatedGrams || 0, resolvedMaterialType, resolvedColor, brand || null, materialSource, resolvedPrintMode, printerId || null, printer?.name || null, slotTime || null, initialStatus, cost, now, now);
  logAction(req.user.id, req.user.fullName, 'CREATE_JOB', `${id} - ${jobName} [${resolvedPrintMode}/${materialSource}]`);
  res.status(201).json(mapJob(db.prepare('SELECT * FROM print_jobs WHERE id=?').get(id) as any));
});

app.patch('/api/jobs/:id', writeLimiter, requireAuth, validate(PatchJobSchema), (req: AuthReq, res: Response) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any;
  if (!job) { res.status(404).json({ error: 'Không tìm thấy job' }); return; }
  const { status, rejectionReason, notes, printerId, slotTime, actualGrams, revisionNote, estimatedGrams, estimatedTime } = req.body;
  if (req.user.role === 'Student') {
    if (job.user_id !== req.user.id) { res.status(403).json({ error: 'Không có quyền' }); return; }
    if (!['Cancelled', 'Submitted'].includes(status)) { res.status(403).json({ error: 'Sinh viên chỉ có thể huỷ hoặc gửi lại job' }); return; }
  }
  const printer = printerId ? db.prepare('SELECT name FROM printers WHERE id=?').get(printerId) as any : null;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) {
    if (req.user.role === 'Student') {
      if (status === 'Cancelled' && !['Draft', 'Submitted', 'Pending review', 'Approved', 'Scheduled', 'Needs Revision'].includes(job.status)) {
        res.status(400).json({ error: 'Khong the huy job o trang thai hien tai' });
        return;
      }
      if (status === 'Submitted' && !['Draft', 'Needs Revision'].includes(job.status)) {
        res.status(400).json({ error: 'Chi co the gui lai job dang nhap hoac can chinh sua' });
        return;
      }
    } else if (!canTransitionJobStatus(job.status, status)) {
      res.status(400).json({ error: `Khong the chuyen trang thai tu ${job.status} sang ${status}` });
      return;
    }
    updates.status = status;
  }
  if (rejectionReason !== undefined) updates.rejection_reason = rejectionReason;
  if (notes !== undefined) updates.notes = notes;
  if (revisionNote !== undefined) updates.revision_note = revisionNote;
  if (printerId !== undefined) { updates.printer_id = printerId; updates.printer_name = printer?.name || null; }
  if (slotTime !== undefined) updates.slot_time = slotTime;
  if (actualGrams !== undefined) updates.actual_grams = actualGrams;
  if (estimatedTime !== undefined) updates.estimated_time = estimatedTime;
  if (estimatedGrams !== undefined) {
    updates.estimated_grams = estimatedGrams;
    // Recalculate cost
    const pricing = db.prepare('SELECT price_per_gram FROM pricing_rules WHERE material=?').get(job.material_type) as any;
    const serviceFeeRow = db.prepare("SELECT amount, enabled FROM service_fees WHERE name='service_fee'").get() as any;
    const matCostPerGram = pricing?.price_per_gram || 0;
    const serviceFeePerGram = (serviceFeeRow?.enabled ? serviceFeeRow?.amount : 0) || 0;
    if (job.print_mode === 'self') {
      updates.cost = job.material_source === 'Lab' ? estimatedGrams * matCostPerGram : 0;
    } else {
      const matCost = job.material_source === 'Lab' ? estimatedGrams * matCostPerGram : 0;
      updates.cost = matCost + estimatedGrams * serviceFeePerGram;
    }
  }
  const setClauses = Object.keys(updates).map(k => `${toSnake(k)}=?`).join(', ');
  db.prepare(`UPDATE print_jobs SET ${setClauses} WHERE id=?`).run(...Object.values(updates), req.params.id);
  if (status === 'Printing' && job.printer_id) db.prepare('UPDATE printers SET status=?,queue_length=MAX(0,queue_length-1) WHERE id=?').run('Busy', job.printer_id);
  if (status === 'Done' && job.printer_id) {
    const rem = (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE printer_id=? AND status='Printing'").get(job.printer_id) as any).c;
    db.prepare('UPDATE printers SET status=?,queue_length=? WHERE id=?').run(rem > 0 ? 'Busy' : 'Available', rem, job.printer_id);
  }
  logAction(req.user.id, req.user.fullName, 'UPDATE_JOB_STATUS', `${req.params.id} → ${status || 'update'}`);
  res.json(mapJob(db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any));
});

app.post('/api/jobs/upload', uploadLimiter, requireAuth, upload.single('file'), (req: AuthReq, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'Không có file' }); return; }
  res.json({ fileName: req.file.filename, originalName: req.file.originalname });
});

app.get('/api/files/:fileName', requireAuth, (req: AuthReq, res: Response) => {
  const fileName = path.basename(req.params.fileName);
  const filePath = path.resolve(UPLOADS_DIR, fileName);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
    res.status(400).json({ error: 'TÃªn file khÃ´ng há»£p lá»‡' });
    return;
  }
  if (!canAccessFile(req.user, fileName)) {
    res.status(403).json({ error: 'KhÃ´ng cÃ³ quyá»n truy cáº­p file nÃ y' });
    return;
  }
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'KhÃ´ng tÃ¬m tháº¥y file' });
    return;
  }
  res.download(filePath);
});

// ─── Printers ─────────────────────────────────────────────────────────────
const mapPrinter = (p: any) => ({ id: p.id, name: p.name, buildVolume: p.build_volume, supportedMaterials: JSON.parse(p.supported_materials || '[]'), status: p.status, queueLength: p.queue_length, nextAvailable: p.next_available, location: p.location || '', imageUrl: p.image_url || '', hasAMS: !!p.has_ams });

app.get('/api/printers', requireAuth, (req, res) => res.json((db.prepare('SELECT * FROM printers ORDER BY location,name').all() as any[]).map(mapPrinter)));

app.post('/api/printers', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { name, buildVolume, supportedMaterials, status, location, imageUrl, hasAMS } = req.body;
  if (!name || !buildVolume) { res.status(400).json({ error: 'Thiếu thông tin' }); return; }
  const id = 'p' + Date.now();
  db.prepare('INSERT INTO printers (id,name,build_volume,supported_materials,status,queue_length,location,image_url,has_ams) VALUES (?,?,?,?,?,0,?,?,?)')
    .run(id, name, buildVolume, JSON.stringify(supportedMaterials || []), status || 'Available', location || '', imageUrl || '', hasAMS ? 1 : 0);
  res.json(mapPrinter(db.prepare('SELECT * FROM printers WHERE id=?').get(id) as any));
});

app.patch('/api/printers/:id', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { status, queueLength, nextAvailable, name, buildVolume, supportedMaterials, location, imageUrl, hasAMS } = req.body;
  db.prepare(`UPDATE printers SET status=COALESCE(?,status),queue_length=COALESCE(?,queue_length),next_available=COALESCE(?,next_available),name=COALESCE(?,name),build_volume=COALESCE(?,build_volume),supported_materials=COALESCE(?,supported_materials),location=COALESCE(?,location),image_url=COALESCE(?,image_url),has_ams=COALESCE(?,has_ams) WHERE id=?`)
    .run(status || null, queueLength ?? null, nextAvailable || null, name || null, buildVolume || null, supportedMaterials ? JSON.stringify(supportedMaterials) : null, location !== undefined ? location : null, imageUrl !== undefined ? imageUrl : null, hasAMS !== undefined ? (hasAMS ? 1 : 0) : null, req.params.id);
  res.json(mapPrinter(db.prepare('SELECT * FROM printers WHERE id=?').get(req.params.id) as any));
});

app.delete('/api/printers/:id', requireAuth, requireRole('Admin'), (req, res) => { db.prepare('DELETE FROM printers WHERE id=?').run(req.params.id); res.json({ ok: true }); });

const printerImageDir = path.join(DATA_DIR, 'printer-images');
mkdirSync(printerImageDir, { recursive: true });
const uploadPrinterImage = multer({ storage: multer.diskStorage({ destination: printerImageDir, filename: (_r, f, cb) => cb(null, `${randomUUID()}${path.extname(f.originalname).toLowerCase()}`) }), limits: { fileSize: 5 * 1024 * 1024 } });
app.use('/printer-images', express.static(printerImageDir));
app.post('/api/printers/upload-image', uploadLimiter, requireAuth, requireRole('Admin'), uploadPrinterImage.single('image'), (req: AuthReq, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'Không có file ảnh' }); return; }
  res.json({ url: `/printer-images/${req.file.filename}` });
});

// ─── Inventory ─────────────────────────────────────────────────────────────
app.get('/api/inventory', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM filament_inventory ORDER BY area,material,color').all() as any[];
  res.json(items.map(i => {
    // Normalize old Vietnamese names to standard EN identifiers so the frontend can group them properly
    let resolvedArea = i.area || 'My Dinh';
    if (resolvedArea === 'Mỹ Đình') resolvedArea = 'My Dinh';
    if (resolvedArea === 'Hòa Lạc') resolvedArea = 'Hoa Lac';
    
    return { 
      ...i, 
      remainingGrams: i.remaining_grams, 
      brand: i.brand || '', 
      area: resolvedArea, 
      status: i.remaining_grams === 0 ? 'Out of Stock' : i.remaining_grams < i.threshold ? 'Low' : 'In Stock' 
    };
  }));
});

app.patch('/api/inventory/:id', requireAuth, requireRole('Admin', 'Moderator'), (req: AuthReq, res: Response) => {
  const { remainingGrams, threshold, color, location, brand, area } = req.body;
  db.prepare('UPDATE filament_inventory SET remaining_grams=COALESCE(?,remaining_grams),threshold=COALESCE(?,threshold),color=COALESCE(?,color),location=COALESCE(?,location),brand=COALESCE(?,brand),area=COALESCE(?,area) WHERE id=?')
    .run(remainingGrams ?? null, threshold ?? null, color || null, location || null, brand ?? null, area ?? null, req.params.id);
  logAction(req.user.id, req.user.fullName, 'UPDATE_INVENTORY', req.params.id);
  res.json({ success: true });
});

app.post('/api/inventory', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { material, color, remainingGrams, threshold, location, brand, area } = req.body;
  const id = `S-${String((db.prepare('SELECT COUNT(*) as c FROM filament_inventory').get() as any).c + 1).padStart(3, '0')}`;
  db.prepare('INSERT INTO filament_inventory (id,material,color,remaining_grams,threshold,location,brand,area) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, material, color, remainingGrams || 1000, threshold || 200, location || '', brand || '', area || 'My Dinh');
  res.status(201).json({ id });
});

app.delete('/api/inventory/:id', requireAuth, requireRole('Admin'), (req, res) => { db.prepare('DELETE FROM filament_inventory WHERE id=?').run(req.params.id); res.json({ ok: true }); });

// ─── Pricing ──────────────────────────────────────────────────────────────
app.get('/api/pricing', (req, res) => res.json((db.prepare('SELECT * FROM pricing_rules').all() as any[]).map(r => ({ id: r.id, material: r.material, pricePerGram: r.price_per_gram }))));

app.put('/api/pricing', writeLimiter, requireAuth, requireRole('Admin'), validate(UpdatePricingSchema), (req: AuthReq, res: Response) => {
  const { rules } = req.body as { rules: Array<{ material: string; pricePerGram: number }> };
  const stmt = db.prepare('UPDATE pricing_rules SET price_per_gram=? WHERE material=?');
  rules.forEach(r => stmt.run(r.pricePerGram, r.material));
  logAction(req.user.id, req.user.fullName, 'UPDATE_PRICING');
  res.json({ success: true });
});

// ─── Users ────────────────────────────────────────────────────────────────
app.get('/api/users', requireAuth, requireRole('Admin'), (req, res) => {
  res.json((db.prepare('SELECT id,email,full_name,student_id,role,phone,supervisor,status,ban_reason,ban_until,created_at FROM users ORDER BY created_at DESC').all() as any[])
    .map(u => ({ id: u.id, email: u.email, fullName: u.full_name, studentId: u.student_id, role: u.role, phone: u.phone, supervisor: u.supervisor, status: u.status, banReason: u.ban_reason, banUntil: u.ban_until, createdAt: u.created_at })));
});

app.patch('/api/users/:id', writeLimiter, requireAuth, requireRole('Admin'), validate(PatchUserSchema), (req: AuthReq, res: Response) => {
  const { status, role, banReason, banUntil } = req.body;
  db.prepare('UPDATE users SET status=COALESCE(?,status),role=COALESCE(?,role),ban_reason=COALESCE(?,ban_reason),ban_until=COALESCE(?,ban_until) WHERE id=?')
    .run(status || null, role || null, banReason !== undefined ? banReason : null, banUntil !== undefined ? banUntil : null, req.params.id);
  logAction(req.user.id, req.user.fullName, 'UPDATE_USER', `${req.params.id} status:${status} role:${role} ban:${banReason}`);
  res.json({ success: true });
});

app.patch('/api/users/:id/password', writeLimiter, requireAuth, requireRole('Admin'), validate(UpdateManagedPasswordSchema), (req: AuthReq, res: Response) => {
  const user = db.prepare('SELECT id,role,full_name,email FROM users WHERE id=?').get(req.params.id) as any;
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    return;
  }
  if (!['Admin', 'Moderator'].includes(user.role)) {
    res.status(403).json({ error: 'Chỉ được đổi mật khẩu cho tài khoản Admin hoặc Moderator' });
    return;
  }

  const { newPassword } = req.body;
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash, user.id);
  logAction(req.user.id, req.user.fullName, 'UPDATE_MANAGED_PASSWORD', `${user.email} (${user.role})`);
  res.json({ success: true });
});

app.delete('/api/users/:id', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
  }
  db.prepare('DELETE FROM print_jobs WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  logAction(req.user.id, req.user.fullName, 'DELETE_USER', req.params.id);
  res.json({ success: true });
});

// ─── Logs ─────────────────────────────────────────────────────────────────
app.get('/api/logs', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  res.json(db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit));
});

// ─── Stats ────────────────────────────────────────────────────────────────
app.get('/api/stats', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  res.json({
    totalJobs: (db.prepare("SELECT COUNT(*) as c FROM print_jobs").get() as any).c,
    pendingReview: (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE status IN ('Submitted','Pending review')").get() as any).c,
    printing: (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE status='Printing'").get() as any).c,
    totalUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status='active'").get() as any).c,
    pendingUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").get() as any).c,
    totalRevenue: ((db.prepare("SELECT SUM(cost) as s FROM print_jobs WHERE status='Done'").get() as any).s) || 0,
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────
app.get('/api/messages', requireAuth, (req: AuthReq, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  if (!canAccessJob(req.user, jobId)) {
    res.status(403).json({ error: 'KhÃ´ng cÃ³ quyá»n xem tin nháº¯n cá»§a job nÃ y' });
    return;
  }
  const msgs = jobId
    ? db.prepare('SELECT * FROM messages WHERE job_id=? ORDER BY created_at ASC').all(jobId)
    : req.user.role === 'Student'
      ? db.prepare(`
        SELECT m.*
        FROM messages m
        LEFT JOIN print_jobs j ON j.id = m.job_id
        WHERE m.job_id IS NULL OR j.user_id=?
        ORDER BY m.created_at DESC
        LIMIT 100
      `).all(req.user.id)
      : db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100').all();
  res.json((msgs as any[]).map(m => ({ id: m.id, userId: m.user_id, userName: m.user_name, userRole: m.user_role, jobId: m.job_id, content: m.content, createdAt: m.created_at })));
});

app.post('/api/messages', writeLimiter, requireAuth, validate(PostMessageSchema), (req: AuthReq, res: Response) => {
  const { content, jobId } = req.body;
  if (!canAccessJob(req.user, jobId)) {
    res.status(403).json({ error: 'KhÃ´ng cÃ³ quyá»n gáº¯n tin nháº¯n vÃ o job nÃ y' });
    return;
  }
  const id = randomUUID(); const now = new Date().toISOString();
  db.prepare('INSERT INTO messages (id,user_id,user_name,user_role,job_id,content,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, req.user.fullName, req.user.role, jobId || null, content.trim(), now);
  res.status(201).json({ id, userId: req.user.id, userName: req.user.fullName, userRole: req.user.role, jobId: jobId || null, content: content.trim(), createdAt: now });
});

// ─── Service Fees ─────────────────────────────────────────────────────────
app.get('/api/service-fees', requireAuth, (req, res) => res.json((db.prepare('SELECT * FROM service_fees ORDER BY name').all() as any[]).map(f => ({ id: f.id, name: f.name, label: f.label, amount: f.amount, description: f.description, enabled: f.enabled !== 0 }))));

app.put('/api/service-fees', writeLimiter, requireAuth, requireRole('Admin'), validate(UpdateServiceFeesSchema), (req: AuthReq, res: Response) => {
  const { fees } = req.body as { fees: Array<{ name: string; amount: number; enabled?: boolean }> };
  const stmt = db.prepare('UPDATE service_fees SET amount=?, enabled=? WHERE name=?');
  fees.forEach(f => stmt.run(f.amount, f.enabled !== false ? 1 : 0, f.name));
  logAction(req.user.id, req.user.fullName, 'UPDATE_SERVICE_FEES');
  res.json({ success: true });
});

// ─── Lab Settings ──────────────────────────────────────────────────────────
// Allowlist of keys that can be written via the settings API
const ALLOWED_SETTING_KEYS = new Set([
  'contact_email', 'contact_facebook', 'contact_zalo', 'guide_url', 'lab_name',
  'require_approval',
]);

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM lab_settings').all() as any[];
  const s: Record<string, string> = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json(s);
});

app.get('/api/settings/admin', requireAuth, requireRole('Admin'), (req, res) => {
  const rows = db.prepare('SELECT key,value FROM lab_settings').all() as any[];
  const s: Record<string, string> = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json(s);
});

app.put('/api/settings', writeLimiter, requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const settings = req.body as Record<string, string>;
  const stmt = db.prepare('INSERT OR REPLACE INTO lab_settings (key,value) VALUES (?,?)');
  // Only write allowlisted keys
  Object.entries(settings).forEach(([k, v]) => {
    if (ALLOWED_SETTING_KEYS.has(k)) stmt.run(k, String(v));
  });
  logAction(req.user.id, req.user.fullName, 'UPDATE_SETTINGS');
  res.json({ success: true });
});

// ─── Stats Daily ───────────────────────────────────────────────────────────
app.get('/api/stats/daily', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  const rows = db.prepare(`
    SELECT DATE(updated_at) as date,
      SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status='Done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status='Needs Revision' THEN 1 ELSE 0 END) as needs_revision
    FROM print_jobs
    WHERE DATE(updated_at) >= DATE('now','-6 days')
    GROUP BY DATE(updated_at)
    ORDER BY date ASC
  `).all() as any[];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const row = rows.find((r: any) => r.date === dateStr);
    result.push({ date: dateStr, approved: row?.approved || 0, done: row?.done || 0, rejected: row?.rejected || 0, needsRevision: row?.needs_revision || 0 });
  }
  res.json(result);
});

// ─── Backup ───────────────────────────────────────────────────────────────
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

function createBackup() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dest = path.join(BACKUP_DIR, `lab-${stamp}.db`);
  copyFileSync(path.join(DATA_DIR, 'lab.db'), dest);
  return `lab-${stamp}.db`;
}

app.post('/api/backup', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => { const f = createBackup(); logAction(req.user.id, req.user.fullName, 'BACKUP_CREATED', f); res.json({ file: f }); });

app.get('/api/backups', requireAuth, requireRole('Admin'), (req, res) => {
  const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, size: statSync(path.join(BACKUP_DIR, f)).size, createdAt: statSync(path.join(BACKUP_DIR, f)).birthtime }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(files);
});

app.get('/api/backups/:file', requireAuth, requireRole('Admin'), (req, res) => {
  // Sanitize filename and prevent path traversal
  const file = path.basename(req.params.file.replace(/[^a-zA-Z0-9\-_.]/g, ''));
  const fp = path.resolve(BACKUP_DIR, file);
  if (!fp.startsWith(path.resolve(BACKUP_DIR))) { res.status(400).json({ error: 'Tên file không hợp lệ' }); return; }
  if (!existsSync(fp)) { res.status(404).json({ error: 'Không tìm thấy file backup' }); return; }
  res.download(fp);
});

// Auto-backup: runs daily at ~2AM, checks every hour
let lastAutoBackupDate = '';
setInterval(() => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (now.getHours() >= 2 && lastAutoBackupDate !== todayStr) {
    lastAutoBackupDate = todayStr;
    try {
      createBackup();
      logger.info('Auto-backup created', { file: `lab-${todayStr}.db` });
    } catch (err) {
      logger.error('Auto-backup failed', { err });
    }
  }
}, 60 * 60 * 1000); // check every hour

// ─── Static frontend (production) ──────────────────────────────────────────
if (IS_PROD) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => { if (!req.path.startsWith('/api')) res.sendFile(path.join(distPath, 'index.html')); });
}

// ─── Start + Graceful shutdown ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`BCSE 3D Lab listening on :${PORT} [${IS_PROD ? 'production' : 'development'}]`);
  logger.info(`Data dir: ${DATA_DIR}`);
});

function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    try { db.close(); logger.info('Database closed'); } catch { }
    process.exit(0);
  });
  // Force exit after 10s if still not closed
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

export default app;


