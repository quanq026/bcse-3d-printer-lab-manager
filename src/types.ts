export enum Role {
  STUDENT = 'Student',
  MODERATOR = 'Moderator',
  ADMIN = 'Admin',
}

export enum JobStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  PENDING_REVIEW = 'Pending review',
  APPROVED = 'Approved',
  SCHEDULED = 'Scheduled',
  PRINTING = 'Printing',
  DONE = 'Done',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
  NEEDS_REVISION = 'Needs Revision',
}

export enum MaterialType {
  PLA = 'PLA',
  PETG = 'PETG',
  TPU = 'TPU',
  ABS = 'ABS',
}

export enum MaterialSource {
  OWN = 'Personal',
  LAB = 'Lab',
}

export interface User {
  id: string;
  fullName: string;
  studentId?: string;
  email: string;
  role: Role;
  phone?: string;
  supervisor?: string;
  status?: string;
}

export interface AdminUser extends User {
  banReason?: string | null;
  banUntil?: string | null;
  createdAt?: string;
}

export interface Printer {
  id: string;
  name: string;
  buildVolume: string;
  supportedMaterials: MaterialType[];
  status: 'Available' | 'Busy' | 'Maintenance';
  queueLength: number;
  nextAvailable?: string;
  location?: string;
  imageUrl?: string;
  hasAMS?: boolean;
}

export interface FilamentInventory {
  id: string;
  material: MaterialType;
  color: string;
  remainingGrams: number;
  threshold: number;
  status: 'In Stock' | 'Low' | 'Out of Stock';
  location?: string;
  brand?: string;
  area?: string;
}

export interface PrintJob {
  id: string;
  userId: string;
  userName: string;
  jobName: string;
  description?: string;
  fileName: string;
  estimatedTime: string; // e.g., "3h 30m"
  estimatedGrams: number;
  actualGrams?: number;
  materialType: MaterialType;
  color: string;
  brand?: string;
  materialSource: MaterialSource;
  printMode?: 'self' | 'lab_assisted';
  printerId?: string;
  printerName?: string;
  slotTime?: string;
  status: JobStatus;
  cost: number;
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
  revisionNote?: string;
  notes?: string;
  moderatorName?: string;
  queuePosition?: number;
}

export interface PricingRule {
  id?: string;
  material: MaterialType;
  pricePerGram: number;
}

export interface ServiceFee {
  id: string;
  name: string;
  label?: string;
  amount: number;
  description?: string;
  enabled: boolean;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  jobId?: string | null;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  details?: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalJobs: number;
  pendingReview: number;
  printing: number;
  totalUsers: number;
  pendingUsers: number;
  totalRevenue: number;
}

export interface DailyStat {
  date: string;
  approved: number;
  done: number;
  rejected: number;
  needsRevision: number;
}

export interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}
