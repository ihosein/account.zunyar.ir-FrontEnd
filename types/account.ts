export interface User {
  id: number;
  phone: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  nationalCode?: string;
  fullName?: string;
  gender?: "male" | "female" | string;
  birthDate?: string;
  province?: string;
  city?: string;
  address?: string;
  educationLevel?: string;
  educationDetail?: string;
  educationStatus?: string;
  avatar?: string;
  phoneVerified?: boolean;
  /** false right after OTP signup, until the user sets a password */
  passwordSet?: boolean;
  nationalIdStatus?: VerificationStatus;
  birthCertificateStatus?: VerificationStatus;
  role?: "USER" | "ADMIN";
}

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface EducationHistory {
  id: number;
  schoolName: string;
  fieldOfStudy?: string;
  degree: string;
  educationLevel?: string;
  educationDetail?: string;
  institutionType?: string;
  fieldGroup?: string;
  specialization?: string;
  startYear: number;
  endYear?: number | null;
  currentlyStudying: boolean;
  description?: string;
  grade?: string;
  certificateUrl?: string;
}

export interface Skill {
  id: number;
  name: string;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | string;
  yearLearned?: number | null;
  certificateUrl?: string;
}

export interface WorkExperience {
  id: number;
  companyName: string;
  title: string;
  employmentType: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  currentlyWorking: boolean;
  description?: string;
  certificateUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** A single role/panel membership a user has within one connected app. */
export interface AppPanelRole {
  id: number;
  panelId: number;
  panelName: string;
  panelKind?: string;
  role: string;
}

export interface ConnectedApp {
  id: number;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  connectedAt?: string;
  panels: AppPanelRole[];
}

export interface UsernameBinding {
  id: number;
  appSlug: string;
  appName: string;
  panelName?: string;
  role?: string;
  username: string;
}

export interface WalletTransaction {
  id: number;
  appSlug?: string;
  appName?: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter?: number;
  description: string;
  createdAt: string;
}

export interface WalletSummary {
  balance: number;
  currency?: string;
}

export interface AppSession {
  id: number;
  appSlug?: string;
  appCode?: string;
  appName?: string;
  device: string;
  browser?: string;
  ip?: string;
  userAgent?: string;
  location?: string;
  lastActiveAt: string;
  current?: boolean;
  active?: boolean;
}

export interface Colleague {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  appSlug: string;
  appName: string;
  panelName: string;
  role: string;
  /** Relationship direction from the current user's perspective. */
  relation: "manager" | "employee";
  /** Public resume slug if available. */
  resumeSlug?: string;
}

export type TicketCategory =
  | "ACCOUNT"
  | "TECHNICAL"
  | "FINANCE"
  | "COLLEAGUE"
  | "OTHER";

export type TicketRecipient = "MANAGER" | "FINANCE" | "TECHNICAL";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";

export type TicketMessageSenderRole = "USER" | "ADMIN" | "SYSTEM";

export interface TicketMessage {
  id: number;
  senderUserId?: number | null;
  senderRole: TicketMessageSenderRole;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  userId?: number | null;
  userPhone?: string | null;
  userName?: string | null;
  subject: string;
  /** Legacy; new tickets use recipient instead. */
  category?: TicketCategory | null;
  recipient?: TicketRecipient | null;
  panelId?: number | null;
  panelName?: string | null;
  body: string;
  status: TicketStatus;
  relatedName?: string | null;
  relatedId?: string | null;
  images?: string[];
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt?: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO";

export type AppCodeFilter = "ACCOUNT" | "ZUNYAR" | "ZUNKO";

export interface ApplicationLog {
  id: number;
  appCode: AppCodeFilter | string;
  level: LogLevel | string;
  loggerName?: string | null;
  message: string;
  stackTrace?: string | null;
  userId?: number | null;
  requestId?: string | null;
  path?: string | null;
  httpMethod?: string | null;
  statusCode?: number | null;
  createdAt: string;
}

export interface ApplicationLogPage {
  content: ApplicationLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type AffiliateCommissionStatus =
  | "UNDER_REVIEW"
  | "QUEUED"
  | "SETTLED"
  | "REJECTED"
  | "ERROR";

export interface AffiliateProgram {
  id: number;
  appCode: string;
  nameFa: string;
  description?: string;
  customerDiscountPercent: number;
  affiliateCommissionPercent: number;
  hasCode: boolean;
  myCode?: string | null;
}

export interface AffiliateCode {
  id: number;
  appCode: string;
  appNameFa: string;
  code: string;
  customerDiscountPercent: number;
  affiliateCommissionPercent: number;
  active: boolean;
  createdAt: string;
}

export interface AffiliateConversion {
  id: number;
  appCode: string;
  appNameFa: string;
  code: string;
  customerName: string;
  customerPhone?: string | null;
  customerOrgName?: string | null;
  registeredCount: number;
  amountPaid: number;
  commissionPercent: number;
  commissionAmount: number;
  status: AffiliateCommissionStatus;
  createdAt: string;
}

export interface AffiliateDashboard {
  totalCommission: number;
  settledCommission: number;
  pendingCommission: number;
  conversionCount: number;
  programs: AffiliateProgram[];
  codes: AffiliateCode[];
  conversions: AffiliateConversion[];
}

export interface AppOption {
  slug: string;
  name: string;
}

export interface PanelOption {
  id: number;
  name: string;
}
