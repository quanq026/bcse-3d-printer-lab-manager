import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { JWT_SECRET, UPLOADS_DIR, DATA_DIR } from './db.js';

// ─── Auth types ────────────────────────────────────────────────────────────
export interface AuthReq extends Request { user?: any; }

// ─── Auth middleware ───────────────────────────────────────────────────────
export function requireAuth(req: AuthReq, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Chưa đăng nhập' }); return; }
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); }
}

export function requireRole(...roles: string[]) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) { res.status(403).json({ error: 'Không có quyền truy cập' }); return; }
    next();
  };
}

// ─── Multer (file uploads) ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
export const upload = multer({
  storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    cb(null, ['.stl', '.3mf', '.gcode'].includes(path.extname(file.originalname).toLowerCase()));
  }
});

export const printerImageDir = path.join(DATA_DIR, 'printer-images');
mkdirSync(printerImageDir, { recursive: true });
export const uploadPrinterImage = multer({ storage: multer.diskStorage({ destination: printerImageDir, filename: (_r, f, cb) => cb(null, Date.now() + path.extname(f.originalname)) }), limits: { fileSize: 5 * 1024 * 1024 } });
