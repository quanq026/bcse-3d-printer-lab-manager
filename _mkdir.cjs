// Run this once: node _create-routes.cjs
// Creates server/routes/ directory and all route modules
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');
fs.mkdirSync(routesDir, { recursive: true });

const files = {

// ═══════════════════════════════════════════════════════════════════════════
'auth.ts': `import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { db, JWT_SECRET, isVjuEmail, logAction } from '../db.js';
import { AuthReq, requireAuth } from '../middleware.js';
import { validate, RegisterSchema, LoginSchema } from '../validation.js';
import { logger } from '../logger.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 15 phút.' },
});

router.post('/register', validate(RegisterSchema), (req: Request, res: Response) => {
  const { email, password, fullName, studentId, phone, supervisor } = req.body;
  if (!isVjuEmail(email)) { res.status(400).json({ error: 'Chỉ chấp nhận email VJU (@st.vju.ac.vn hoặc @vju.ac.vn)' }); return; }
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) { res.status(409).json({ error: 'Email đã được đăng ký' }); return; }

  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(\`INSERT INTO users (id,email,password_hash,full_name,student_id,phone,supervisor,role,status,created_at) VALUES (?,?,?,?,?,?,?,'Student','active',?)\`)
    .run(id, email, hash, fullName, studentId || null, phone || null, supervisor || null, new Date().toISOString());
  logAction(id, fullName, 'REGISTER', \`Email: \${email}\`);
  logger.info('User registered', { email });
  res.json({ message: 'Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ.' });
});

router.post('/login', authLimiter, validate(LoginSchema), (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.warn('Failed login attempt', { email, ip: req.ip });
    res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    return;
  }
  if (user.status === 'pending') { res.status(403).json({ error: 'Tài khoản đang chờ Admin phê duyệt' }); return; }
  if (user.status === 'suspended') { res.status(403).json({ error: 'Tài khoản đã bị tạm khoá' }); return; }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
  logAction(user.id, user.full_name, 'LOGIN');
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, studentId: user.student_id, phone: user.phone, supervisor: user.supervisor } });
});

router.get('/me', requireAuth, (req: AuthReq, res: Response) => {
  const user = db.prepare('SELECT id,email,full_name,student_id,role,phone,supervisor,status FROM users WHERE id=?').get(req.user.id) as any;
  if (!user) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }
  res.json({ id: user.id, email: user.email, fullName: user.full_name, studentId: user.student_id, role: user.role, phone: user.phone, supervisor: user.supervisor, status: user.status });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'jobs.ts': `import { Router, Response } from 'express';
import { db, logAction, jobCode, mapJob, toSnake } from '../db.js';
import { AuthReq, requireAuth, upload } from '../middleware.js';
import { validate, CreateJobSchema, PatchJobSchema } from '../validation.js';

const router = Router();

router.get('/queue', requireAuth, (req: AuthReq, res: Response) => {
  const jobs = db.prepare(\`SELECT * FROM print_jobs WHERE status IN ('Submitted','Pending review','Approved','Scheduled','Printing') ORDER BY created_at ASC\`).all();
  res.json((jobs as any[]).map((j, idx) => ({ ...mapJob(j), queuePosition: idx + 1 })));
});

router.get('/', requireAuth, (req: AuthReq, res: Response) => {
  const jobs = req.user.role === 'Student'
    ? db.prepare('SELECT * FROM print_jobs WHERE user_id=? ORDER BY created_at DESC').all(req.user.id)
    : db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC').all();
  res.json((jobs as any[]).map(mapJob));
});

router.get('/:id', requireAuth, (req: AuthReq, res: Response) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any;
  if (!job) { res.status(404).json({ error: 'Không tìm thấy job' }); return; }
  if (req.user.role === 'Student' && job.user_id !== req.user.id) { res.status(403).json({ error: 'Không có quyền' }); return; }
  res.json(mapJob(job));
});

router.post('/', requireAuth, validate(CreateJobSchema), (req: AuthReq, res: Response) => {
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
  db.prepare(\`INSERT INTO print_jobs (id,user_id,user_name,job_name,description,file_name,estimated_time,estimated_grams,material_type,color,brand,material_source,print_mode,printer_id,printer_name,slot_time,status,cost,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`)
    .run(id, req.user.id, req.user.fullName, jobName, description || null, fileName || '', estimatedTime || null, estimatedGrams || 0, resolvedMaterialType, resolvedColor, brand || null, materialSource, resolvedPrintMode, printerId || null, printer?.name || null, slotTime || null, initialStatus, cost, now, now);
  logAction(req.user.id, req.user.fullName, 'CREATE_JOB', \`\${id} - \${jobName} [\${resolvedPrintMode}/\${materialSource}]\`);
  res.status(201).json(mapJob(db.prepare('SELECT * FROM print_jobs WHERE id=?').get(id) as any));
});

router.patch('/:id', requireAuth, validate(PatchJobSchema), (req: AuthReq, res: Response) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any;
  if (!job) { res.status(404).json({ error: 'Không tìm thấy job' }); return; }
  const { status, rejectionReason, notes, printerId, slotTime, actualGrams, revisionNote, estimatedGrams, estimatedTime } = req.body;
  if (req.user.role === 'Student') {
    if (job.user_id !== req.user.id) { res.status(403).json({ error: 'Không có quyền' }); return; }
    if (!['Cancelled', 'Submitted'].includes(status)) { res.status(403).json({ error: 'Sinh viên chỉ có thể huỷ hoặc gửi lại job' }); return; }
  }
  const printer = printerId ? db.prepare('SELECT name FROM printers WHERE id=?').get(printerId) as any : null;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (rejectionReason !== undefined) updates.rejection_reason = rejectionReason;
  if (notes !== undefined) updates.notes = notes;
  if (revisionNote !== undefined) updates.revision_note = revisionNote;
  if (printerId !== undefined) { updates.printer_id = printerId; updates.printer_name = printer?.name || null; }
  if (slotTime !== undefined) updates.slot_time = slotTime;
  if (actualGrams !== undefined) updates.actual_grams = actualGrams;
  if (estimatedTime !== undefined) updates.estimated_time = estimatedTime;
  if (estimatedGrams !== undefined) {
    updates.estimated_grams = estimatedGrams;
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
  const setClauses = Object.keys(updates).map(k => \`\${toSnake(k)}=?\`).join(', ');
  db.prepare(\`UPDATE print_jobs SET \${setClauses} WHERE id=?\`).run(...Object.values(updates), req.params.id);
  if (status === 'Printing' && job.printer_id) db.prepare('UPDATE printers SET status=?,queue_length=MAX(0,queue_length-1) WHERE id=?').run('Busy', job.printer_id);
  if (status === 'Done' && job.printer_id) {
    const rem = (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE printer_id=? AND status='Printing'").get(job.printer_id) as any).c;
    db.prepare('UPDATE printers SET status=?,queue_length=? WHERE id=?').run(rem > 0 ? 'Busy' : 'Available', rem, job.printer_id);
  }
  logAction(req.user.id, req.user.fullName, 'UPDATE_JOB_STATUS', \`\${req.params.id} → \${status || 'update'}\`);
  res.json(mapJob(db.prepare('SELECT * FROM print_jobs WHERE id=?').get(req.params.id) as any));
});

router.post('/upload', requireAuth, upload.single('file'), (req: AuthReq, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'Không có file' }); return; }
  res.json({ fileName: req.file.filename, originalName: req.file.originalname });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'printers.ts': `import { Router, Response } from 'express';
import express from 'express';
import { db, mapPrinter } from '../db.js';
import { AuthReq, requireAuth, requireRole, uploadPrinterImage, printerImageDir } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, (req, res) => res.json((db.prepare('SELECT * FROM printers ORDER BY location,name').all() as any[]).map(mapPrinter)));

router.post('/', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { name, buildVolume, supportedMaterials, status, location, imageUrl, hasAMS } = req.body;
  if (!name || !buildVolume) { res.status(400).json({ error: 'Thiếu thông tin' }); return; }
  const id = 'p' + Date.now();
  db.prepare('INSERT INTO printers (id,name,build_volume,supported_materials,status,queue_length,location,image_url,has_ams) VALUES (?,?,?,?,?,0,?,?,?)')
    .run(id, name, buildVolume, JSON.stringify(supportedMaterials || []), status || 'Available', location || '', imageUrl || '', hasAMS ? 1 : 0);
  res.json(mapPrinter(db.prepare('SELECT * FROM printers WHERE id=?').get(id) as any));
});

router.patch('/:id', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { status, queueLength, nextAvailable, name, buildVolume, supportedMaterials, location, imageUrl, hasAMS } = req.body;
  db.prepare(\`UPDATE printers SET status=COALESCE(?,status),queue_length=COALESCE(?,queue_length),next_available=COALESCE(?,next_available),name=COALESCE(?,name),build_volume=COALESCE(?,build_volume),supported_materials=COALESCE(?,supported_materials),location=COALESCE(?,location),image_url=COALESCE(?,image_url),has_ams=COALESCE(?,has_ams) WHERE id=?\`)
    .run(status || null, queueLength ?? null, nextAvailable || null, name || null, buildVolume || null, supportedMaterials ? JSON.stringify(supportedMaterials) : null, location !== undefined ? location : null, imageUrl !== undefined ? imageUrl : null, hasAMS !== undefined ? (hasAMS ? 1 : 0) : null, req.params.id);
  res.json(mapPrinter(db.prepare('SELECT * FROM printers WHERE id=?').get(req.params.id) as any));
});

router.delete('/:id', requireAuth, requireRole('Admin'), (req, res) => { db.prepare('DELETE FROM printers WHERE id=?').run(req.params.id); res.json({ ok: true }); });

router.post('/upload-image', requireAuth, requireRole('Admin'), uploadPrinterImage.single('image'), (req: AuthReq, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'Không có file ảnh' }); return; }
  res.json({ url: \`/printer-images/\${req.file.filename}\` });
});

// Static serving for printer images — mounted by index.ts as app.use('/printer-images', ...)
export { printerImageDir };

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'inventory.ts': `import { Router, Response } from 'express';
import { db, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM filament_inventory ORDER BY area,material,color').all() as any[];
  res.json(items.map(i => ({ ...i, remainingGrams: i.remaining_grams, brand: i.brand || '', area: i.area || 'Mỹ Đình', status: i.remaining_grams === 0 ? 'Out of Stock' : i.remaining_grams < i.threshold ? 'Low' : 'In Stock' })));
});

router.patch('/:id', requireAuth, requireRole('Admin', 'Moderator'), (req: AuthReq, res: Response) => {
  const { remainingGrams, threshold, color, location, brand, area } = req.body;
  db.prepare('UPDATE filament_inventory SET remaining_grams=COALESCE(?,remaining_grams),threshold=COALESCE(?,threshold),color=COALESCE(?,color),location=COALESCE(?,location),brand=COALESCE(?,brand),area=COALESCE(?,area) WHERE id=?')
    .run(remainingGrams ?? null, threshold ?? null, color || null, location || null, brand ?? null, area ?? null, req.params.id);
  logAction(req.user.id, req.user.fullName, 'UPDATE_INVENTORY', req.params.id);
  res.json({ success: true });
});

router.post('/', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const { material, color, remainingGrams, threshold, location, brand, area } = req.body;
  const id = \`S-\${String((db.prepare('SELECT COUNT(*) as c FROM filament_inventory').get() as any).c + 1).padStart(3, '0')}\`;
  db.prepare('INSERT INTO filament_inventory (id,material,color,remaining_grams,threshold,location,brand,area) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, material, color, remainingGrams || 1000, threshold || 200, location || '', brand || '', area || 'Mỹ Đình');
  res.status(201).json({ id });
});

router.delete('/:id', requireAuth, requireRole('Admin'), (req, res) => { db.prepare('DELETE FROM filament_inventory WHERE id=?').run(req.params.id); res.json({ ok: true }); });

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'pricing.ts': `import { Router, Response } from 'express';
import { db, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';
import { validate, UpdatePricingSchema } from '../validation.js';

const router = Router();

router.get('/', (req, res) => res.json((db.prepare('SELECT * FROM pricing_rules').all() as any[]).map(r => ({ id: r.id, material: r.material, pricePerGram: r.price_per_gram }))));

router.put('/', requireAuth, requireRole('Admin'), validate(UpdatePricingSchema), (req: AuthReq, res: Response) => {
  const { rules } = req.body as { rules: Array<{ material: string; pricePerGram: number }> };
  const stmt = db.prepare('UPDATE pricing_rules SET price_per_gram=? WHERE material=?');
  rules.forEach(r => stmt.run(r.pricePerGram, r.material));
  logAction(req.user.id, req.user.fullName, 'UPDATE_PRICING');
  res.json({ success: true });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'users.ts': `import { Router, Response } from 'express';
import { db, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';
import { validate, PatchUserSchema } from '../validation.js';

const router = Router();

router.get('/', requireAuth, requireRole('Admin'), (req, res) => {
  res.json((db.prepare('SELECT id,email,full_name,student_id,role,phone,supervisor,status,ban_reason,ban_until,created_at FROM users ORDER BY created_at DESC').all() as any[])
    .map(u => ({ id: u.id, email: u.email, fullName: u.full_name, studentId: u.student_id, role: u.role, phone: u.phone, supervisor: u.supervisor, status: u.status, banReason: u.ban_reason, banUntil: u.ban_until, createdAt: u.created_at })));
});

router.patch('/:id', requireAuth, requireRole('Admin'), validate(PatchUserSchema), (req: AuthReq, res: Response) => {
  const { status, role, banReason, banUntil } = req.body;
  db.prepare('UPDATE users SET status=COALESCE(?,status),role=COALESCE(?,role),ban_reason=COALESCE(?,ban_reason),ban_until=COALESCE(?,ban_until) WHERE id=?')
    .run(status || null, role || null, banReason !== undefined ? banReason : null, banUntil !== undefined ? banUntil : null, req.params.id);
  logAction(req.user.id, req.user.fullName, 'UPDATE_USER', \`\${req.params.id} status:\${status} role:\${role} ban:\${banReason}\`);
  res.json({ success: true });
});

router.delete('/:id', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
  }
  db.prepare('DELETE FROM print_jobs WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  logAction(req.user.id, req.user.fullName, 'DELETE_USER', req.params.id);
  res.json({ success: true });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'messages.ts': `import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { AuthReq, requireAuth } from '../middleware.js';
import { validate, PostMessageSchema } from '../validation.js';

const router = Router();

router.get('/', requireAuth, (req: AuthReq, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  const msgs = jobId ? db.prepare('SELECT * FROM messages WHERE job_id=? ORDER BY created_at ASC').all(jobId)
    : db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100').all();
  res.json((msgs as any[]).map(m => ({ id: m.id, userId: m.user_id, userName: m.user_name, userRole: m.user_role, jobId: m.job_id, content: m.content, createdAt: m.created_at })));
});

router.post('/', requireAuth, validate(PostMessageSchema), (req: AuthReq, res: Response) => {
  const { content, jobId } = req.body;
  const id = randomUUID(); const now = new Date().toISOString();
  db.prepare('INSERT INTO messages (id,user_id,user_name,user_role,job_id,content,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, req.user.fullName, req.user.role, jobId || null, content.trim(), now);
  res.status(201).json({ id, userId: req.user.id, userName: req.user.fullName, userRole: req.user.role, jobId: jobId || null, content: content.trim(), createdAt: now });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'settings.ts': `import { Router, Response } from 'express';
import { db, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';

const router = Router();

const ALLOWED_SETTING_KEYS = new Set([
  'contact_email', 'contact_facebook', 'contact_zalo', 'guide_url', 'lab_name',
  'require_approval',
]);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM lab_settings').all() as any[];
  const s: Record<string, string> = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json(s);
});

router.get('/admin', requireAuth, requireRole('Admin'), (req, res) => {
  const rows = db.prepare('SELECT key,value FROM lab_settings').all() as any[];
  const s: Record<string, string> = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json(s);
});

router.put('/', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => {
  const settings = req.body as Record<string, string>;
  const stmt = db.prepare('INSERT OR REPLACE INTO lab_settings (key,value) VALUES (?,?)');
  Object.entries(settings).forEach(([k, v]) => {
    if (ALLOWED_SETTING_KEYS.has(k)) stmt.run(k, String(v));
  });
  logAction(req.user.id, req.user.fullName, 'UPDATE_SETTINGS');
  res.json({ success: true });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'stats.ts': `import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  res.json({
    totalJobs: (db.prepare("SELECT COUNT(*) as c FROM print_jobs").get() as any).c,
    pendingReview: (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE status IN ('Submitted','Pending review')").get() as any).c,
    printing: (db.prepare("SELECT COUNT(*) as c FROM print_jobs WHERE status='Printing'").get() as any).c,
    totalUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status='active'").get() as any).c,
    pendingUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").get() as any).c,
    totalRevenue: ((db.prepare("SELECT SUM(cost) as s FROM print_jobs WHERE status='Done'").get() as any).s) || 0,
  });
});

router.get('/daily', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  const rows = db.prepare(\`
    SELECT DATE(updated_at) as date,
      SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status='Done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status='Needs Revision' THEN 1 ELSE 0 END) as needs_revision
    FROM print_jobs
    WHERE DATE(updated_at) >= DATE('now','-6 days')
    GROUP BY DATE(updated_at)
    ORDER BY date ASC
  \`).all() as any[];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const row = rows.find((r: any) => r.date === dateStr);
    result.push({ date: dateStr, approved: row?.approved || 0, done: row?.done || 0, rejected: row?.rejected || 0, needsRevision: row?.needs_revision || 0 });
  }
  res.json(result);
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'backup.ts': `import { Router, Response } from 'express';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { BACKUP_DIR, createBackup, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';

const router = Router();

router.post('/', requireAuth, requireRole('Admin'), (req: AuthReq, res: Response) => { const f = createBackup(); logAction(req.user.id, req.user.fullName, 'BACKUP_CREATED', f); res.json({ file: f }); });

router.get('/', requireAuth, requireRole('Admin'), (req, res) => {
  const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'))
    .map(f => ({ name: f, size: statSync(path.join(BACKUP_DIR, f)).size, createdAt: statSync(path.join(BACKUP_DIR, f)).birthtime }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(files);
});

router.get('/:file', requireAuth, requireRole('Admin'), (req, res) => {
  const file = path.basename(req.params.file.replace(/[^a-zA-Z0-9\\-_.]/g, ''));
  const fp = path.resolve(BACKUP_DIR, file);
  if (!fp.startsWith(path.resolve(BACKUP_DIR))) { res.status(400).json({ error: 'Tên file không hợp lệ' }); return; }
  if (!existsSync(fp)) { res.status(404).json({ error: 'Không tìm thấy file backup' }); return; }
  res.download(fp);
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'serviceFees.ts': `import { Router, Response } from 'express';
import { db, logAction } from '../db.js';
import { AuthReq, requireAuth, requireRole } from '../middleware.js';
import { validate, UpdateServiceFeesSchema } from '../validation.js';

const router = Router();

router.get('/', requireAuth, (req, res) => res.json((db.prepare('SELECT * FROM service_fees ORDER BY name').all() as any[]).map(f => ({ id: f.id, name: f.name, label: f.label, amount: f.amount, description: f.description, enabled: f.enabled !== 0 }))));

router.put('/', requireAuth, requireRole('Admin'), validate(UpdateServiceFeesSchema), (req: AuthReq, res: Response) => {
  const { fees } = req.body as { fees: Array<{ name: string; amount: number; enabled?: boolean }> };
  const stmt = db.prepare('UPDATE service_fees SET amount=?, enabled=? WHERE name=?');
  fees.forEach(f => stmt.run(f.amount, f.enabled !== false ? 1 : 0, f.name));
  logAction(req.user.id, req.user.fullName, 'UPDATE_SERVICE_FEES');
  res.json({ success: true });
});

export default router;
`,

// ═══════════════════════════════════════════════════════════════════════════
'logs.ts': `import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('Admin', 'Moderator'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  res.json(db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit));
});

export default router;
`,

};

// Write all files
for (const [filename, content] of Object.entries(files)) {
  const filePath = path.join(routesDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('  ✓ server/routes/' + filename);
}

console.log('\\nAll route files created successfully!');
console.log('You can now delete this script: del _create-routes.cjs');

