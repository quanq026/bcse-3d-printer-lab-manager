import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

// ─── Auth schemas ───────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(128)
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
  fullName: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100).trim(),
  studentId: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  supervisor: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const ManagedPasswordSchema = z.string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(128)
  .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số');

// ─── Job schemas ────────────────────────────────────────────────────────────

export const CreateJobSchema = z.object({
  jobName: z.string().min(1, 'Tên job không được để trống').max(200).trim(),
  description: z.string().max(2000).optional(),
  fileName: z.string().max(255).optional(),
  estimatedTime: z.string().max(50).optional(),
  estimatedGrams: z.number().int().min(0).max(10000).optional(),
  materialType: z.enum(['PLA', 'PETG', 'TPU', 'ABS']).optional(),
  color: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  materialSource: z.enum(['Lab', 'Personal'], { message: 'materialSource phải là Lab hoặc Personal' }),
  printMode: z.enum(['self', 'lab_assisted']).optional(),
  printerId: z.string().max(50).optional(),
  slotTime: z.string().max(50).optional(),
});

export const PatchJobSchema = z.object({
  status: z.string().max(50).optional(),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  printerId: z.string().max(50).optional(),
  slotTime: z.string().max(50).optional(),
  actualGrams: z.number().int().min(0).max(10000).optional(),
  revisionNote: z.string().max(500).optional(),
  estimatedGrams: z.number().int().min(0).max(10000).optional(),
  estimatedTime: z.string().max(50).optional(),
}).strict();

// ─── Admin schemas ──────────────────────────────────────────────────────────

export const PatchUserSchema = z.object({
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  role: z.enum(['Admin', 'Moderator', 'Student']).optional(),
  banReason: z.string().max(500).optional(),
  banUntil: z.string().max(50).optional(),
}).strict();

export const UpdateManagedPasswordSchema = z.object({
  newPassword: ManagedPasswordSchema,
}).strict();

export const ChangeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại').max(128),
  newPassword: ManagedPasswordSchema,
}).strict();

export const UpdatePricingSchema = z.object({
  rules: z.array(z.object({
    material: z.string().min(1).max(20),
    pricePerGram: z.number().min(0).max(10_000_000),
  })).max(20),
});

export const UpdateServiceFeesSchema = z.object({
  fees: z.array(z.object({
    name: z.string().min(1).max(50),
    amount: z.number().min(0).max(100_000_000),
    enabled: z.boolean().optional(),
  })).max(20),
});

// ─── Message schemas ────────────────────────────────────────────────────────

export const PostMessageSchema = z.object({
  content: z.string().min(1, 'Nội dung không được để trống').max(5000).trim(),
  jobId: z.string().max(50).optional(),
});

// ─── Middleware factory ─────────────────────────────────────────────────────

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Dữ liệu không hợp lệ',
        details: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data; // replace with parsed + stripped output
    next();
  };
}
