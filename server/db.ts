import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { mkdirSync, existsSync, copyFileSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

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

// ─── Constants ─────────────────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || 'bcse-vju-3dlab-secret-2025';
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const IS_PROD = process.env.NODE_ENV === 'production';
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

export const VJU_DOMAINS = ['st.vju.ac.vn', 'vju.ac.vn'];
export function isVjuEmail(email: string) {
  const lower = email.toLowerCase().trim();
  return VJU_DOMAINS.some(d => lower.endsWith('@' + d));
}

// Fail fast in production if JWT secret is default (insecure)
if (IS_PROD && JWT_SECRET === 'bcse-vju-3dlab-secret-2025') {
  logger.error('JWT_SECRET must be set to a secure random value in production. Exiting.');
  process.exit(1);
}

// Warn in development if using default secret
if (!IS_PROD && JWT_SECRET === 'bcse-vju-3dlab-secret-2025') {
  logger.warn('Using default JWT_SECRET — set JWT_SECRET in .env for security.');
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

// ─── Database ──────────────────────────────────────────────────────────────
export const db = new Database(path.join(DATA_DIR, 'lab.db'));
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
try { db.exec(`ALTER TABLE filament_inventory ADD COLUMN area TEXT NOT NULL DEFAULT 'Mỹ Đình'`); } catch { }
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
    const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'Admin@2024';
    const modPwd = process.env.SEED_MOD_PASSWORD || 'Mod@2024';
    if (IS_PROD && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_MOD_PASSWORD)) {
      logger.warn('Using default seed passwords in production — set SEED_ADMIN_PASSWORD and SEED_MOD_PASSWORD in .env');
    }
    const hash = bcrypt.hashSync(adminPwd, 10);
    db.prepare(`INSERT INTO users (id,email,password_hash,full_name,role,status,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), 'admin@vju.ac.vn', hash, 'Admin BCSE Lab', 'Admin', 'active', new Date().toISOString());
    const modHash = bcrypt.hashSync(modPwd, 10);
    db.prepare(`INSERT INTO users (id,email,password_hash,full_name,role,status,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), 'mod@vju.ac.vn', modHash, 'Moderator Lab', 'Moderator', 'active', new Date().toISOString());
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
      { id: 'S-001', mat: 'PLA', color: 'Trắng', g: 850, t: 200, loc: 'Tủ A1', brand: 'Bambu', area: 'Mỹ Đình' },
      { id: 'S-002', mat: 'PLA', color: 'Đen', g: 120, t: 200, loc: 'Tủ A1', brand: 'Bambu', area: 'Mỹ Đình' },
      { id: 'S-003', mat: 'PETG', color: 'Xanh dương', g: 450, t: 150, loc: 'Tủ B2', brand: 'Elegoo', area: 'Hòa Lạc' },
      { id: 'S-004', mat: 'PLA', color: 'Đỏ', g: 0, t: 200, loc: 'Tủ A2', brand: 'Bambu', area: 'Mỹ Đình' },
      { id: 'S-005', mat: 'PLA', color: 'Xám', g: 920, t: 200, loc: 'Tủ A1', brand: 'Generic', area: 'Hòa Lạc' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────
export function getSetting(key: string): string {
  return ((db.prepare('SELECT value FROM lab_settings WHERE key=?').get(key) as any)?.value) || '';
}

export function logAction(userId: string | null, userName: string | null, action: string, details?: string) {
  db.prepare(`INSERT INTO activity_logs (id,user_id,user_name,action,details,created_at) VALUES (?,?,?,?,?,?)`)
    .run(randomUUID(), userId, userName, action, details || null, new Date().toISOString());
}

export function jobCode() {
  const n = (db.prepare('SELECT COUNT(*) as c FROM print_jobs').get() as any).c + 1;
  return `JOB-${String(n).padStart(3, '0')}`;
}

export function mapJob(j: any) {
  return { id: j.id, userId: j.user_id, userName: j.user_name, jobName: j.job_name, description: j.description, fileName: j.file_name, estimatedTime: j.estimated_time, estimatedGrams: j.estimated_grams, actualGrams: j.actual_grams, materialType: j.material_type, color: j.color, brand: j.brand, materialSource: j.material_source, printMode: j.print_mode || 'self', printerId: j.printer_id, printerName: j.printer_name, slotTime: j.slot_time, status: j.status, cost: j.cost, rejectionReason: j.rejection_reason, revisionNote: j.revision_note, notes: j.notes, createdAt: j.created_at, updatedAt: j.updated_at };
}

export function mapPrinter(p: any) {
  return { id: p.id, name: p.name, buildVolume: p.build_volume, supportedMaterials: JSON.parse(p.supported_materials || '[]'), status: p.status, queueLength: p.queue_length, nextAvailable: p.next_available, location: p.location || '', imageUrl: p.image_url || '', hasAMS: !!p.has_ams };
}

export function toSnake(s: string) { return s.replace(/([A-Z])/g, '_$1').toLowerCase(); }

export function createBackup() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dest = path.join(BACKUP_DIR, `lab-${stamp}.db`);
  copyFileSync(path.join(DATA_DIR, 'lab.db'), dest);
  return `lab-${stamp}.db`;
}
