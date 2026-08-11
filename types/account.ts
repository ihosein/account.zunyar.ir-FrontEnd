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

export type MessageLevel = "INFO" | "NOTICE" | "WARNING" | "ALERT" | "CRITICAL";

export type AppCode = "ACCOUNT" | "ZUNYAR" | "ZUNKO";

export type SmsCampaignStatus = "PENDING" | "SENDING" | "SENT" | "PARTIAL" | "FAILED";

export type EmailCampaignStatus = "PENDING" | "SENDING" | "SENT" | "PARTIAL" | "FAILED";

export interface InboxMessage {
  id: number;
  title: string;
  body: string;
  level: MessageLevel | string;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
  createdAt?: string;
  appCodes?: string[];
  targetAllApps?: boolean;
}

export interface BroadcastAdminMessage {
  id: number;
  title: string;
  body: string;
  level: MessageLevel | string;
  targetAllApps: boolean;
  targetAllUsers: boolean;
  appCodes?: AppCode[] | string[];
  userCount: number;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
  active: boolean;
  createdAt?: string;
  createdByName?: string | null;
}

export interface SmsCampaign {
  id: number;
  body: string;
  targetAllApps: boolean;
  targetAllUsers: boolean;
  appCodes?: AppCode[] | string[];
  status: SmsCampaignStatus | string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt?: string;
  createdByName?: string | null;
}

export interface EmailCampaign {
  id: number;
  subject: string;
  body: string;
  useTemplate?: boolean;
  headline?: string | null;
  footer?: string | null;
  brandName?: string | null;
  brandSubtitle?: string | null;
  brandLogo?: string | null;
  targetAllApps: boolean;
  targetAllUsers: boolean;
  appCodes?: AppCode[] | string[];
  status: EmailCampaignStatus | string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount?: number;
  createdAt?: string;
  createdByName?: string | null;
}

export interface SmsSettings {
  id?: number;
  name?: string | null;
  active?: boolean;
  enabled: boolean;
  apiKeySet: boolean;
  apiKeyMasked?: string | null;
  lineNumber?: string | null;
  templateId: number;
  parameterName?: string | null;
  baseUrl?: string | null;
  exposeDebugCode: boolean;
  credit?: number | null;
  creditError?: string | null;
  updatedAt?: string | null;
}

export interface SmsPanelsList {
  panels: SmsSettings[];
  activePanelId?: number | null;
}

export interface AudiencePreview {
  count: number;
  sample?: { id: number; phone?: string; firstName?: string; lastName?: string }[];
}

/** Spring Data Page shape returned by some admin list endpoints. */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
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

export interface BankAccount {
  id: number;
  title: string;
  iban: string;
  createdAt?: string;
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
  appCode?: AppCodeFilter | string | null;
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
  /** حجم فایل‌های لاگ مرتبط (بایت) */
  totalBytes?: number;
}

export interface LogDeleteResult {
  deleted: number;
}

export interface HostResource {
  cpuUsagePercent: number;
  cpuMhz: number;
  cpuMaxMhz: number;
  cpuCores: number;
  ramTotalBytes: number;
  ramUsedBytes: number;
  ramAvailableBytes: number;
  ramUsagePercent: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskFreeBytes: number;
  diskUsagePercent: number;
  diskRoot: string;
  hostname?: string | null;
  osName?: string | null;
}

export interface AppResource {
  appCode: string;
  labelFa?: string | null;
  icon?: string | null;
  path: string;
  pathExists: boolean;
  diskBytes: number;
  processRamBytes?: number | null;
  processCpuPercent?: number | null;
  processCount?: number | null;
  services?: ServiceStatus[] | null;
}

export interface ServiceStatus {
  unit: string;
  labelFa?: string | null;
  activeState: string;
  subState?: string | null;
  loadState?: string | null;
  unitFileState?: string | null;
  result?: string | null;
  mainPid?: number | null;
  description?: string | null;
  running: boolean;
  failed: boolean;
  /** نسخه بک‌اند/فرانت در حال اجرا یا دیپلوی‌شده */
  version?: string | null;
  /** رم مصرفی این سرویس (بایت) */
  processRamBytes?: number | null;
  /** درصد CPU این سرویس */
  processCpuPercent?: number | null;
  processCount?: number | null;
  lastError?: string | null;
}

export interface DatabaseResource {
  key?: string | null;
  labelFa?: string | null;
  shared: boolean;
  /** دیتابیس مکمل سفارشی مشتری */
  supplementary?: boolean;
  engine?: string | null;
  databaseName?: string | null;
  databaseBytes?: number | null;
  allDatabasesBytes?: number | null;
  processRamBytes?: number | null;
  processCpuPercent?: number | null;
  processCount?: number | null;
  reachable: boolean;
  services?: ServiceStatus[] | null;
}

export interface AdminAffiliatePartner {
  codeId: number;
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  appCode: string;
  appNameFa?: string | null;
  code: string;
  customerDiscountPercent: number;
  affiliateCommissionPercent: number;
  programDiscountPercent?: number;
  programCommissionPercent?: number;
  active: boolean;
  conversionCount: number;
  createdAt?: string;
}

export type IdentityDocType = "NATIONAL_ID" | "BIRTH_CERT" | "OTHER";
export type IdentityDocStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminIdentityDoc {
  id: number;
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  nationalCode?: string | null;
  docType: IdentityDocType;
  status: IdentityDocStatus;
  /** تصویر فقط از endpoint جداگانه با نقش ادمین قابل دریافت است. */
  hasImage?: boolean;
  reviewNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  reviewedByName?: string | null;
}

export interface AdminIdentityList {
  items: AdminIdentityDoc[];
  pendingCount: number;
}

export interface OrgChildResource {
  key: string;
  labelFa: string;
  domain?: string | null;
  path: string;
  icon?: string | null;
  pathExists: boolean;
  diskBytes: number;
  processRamBytes?: number | null;
  processCpuPercent?: number | null;
  processCount?: number | null;
  services?: ServiceStatus[] | null;
}

export interface OrgResource {
  key: string;
  labelFa: string;
  path: string;
  siteUrl?: string | null;
  icon?: string | null;
  pathExists: boolean;
  diskBytes: number;
  processRamBytes?: number | null;
  processCpuPercent?: number | null;
  processCount?: number | null;
  services?: ServiceStatus[] | null;
  children?: OrgChildResource[] | null;
}

export interface ServerMonitor {
  host: HostResource;
  apps: AppResource[];
  database?: DatabaseResource | null;
  /** دیتابیس‌های مکمل (کشف خودکار + کانفیگ) */
  extraDatabases?: DatabaseResource[] | null;
  organizations?: OrgResource[] | null;
  sharedServices?: ServiceStatus[] | null;
  collectedAt: string;
}

export interface AdminPanelCustomer {
  panelId: number;
  panelCode: string;
  panelName: string;
  organizationLabel?: string | null;
  appCode: string;
  appNameFa: string;
  managerUserId?: number | null;
  managerName?: string | null;
  managerPhone?: string | null;
  managerNationalCode?: string | null;
  /** تعداد دانش‌آموزان پنل */
  studentCount: number;
  /** تعداد کارمندان / منابع انسانی */
  staffCount: number;
  createdAt: string;
}

export interface AdminPanelCustomerPage {
  content: AdminPanelCustomer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminUserPanelRole {
  panelId: number;
  panelCode: string;
  panelName: string;
  appCode: string;
  appNameFa: string;
  roleCode?: string | null;
  roleLabelFa?: string | null;
}

export interface AdminAccountUser {
  userId: number;
  phone: string;
  nationalCode?: string | null;
  fullName?: string | null;
  email?: string | null;
  role?: "USER" | "ADMIN" | string;
  enabled: boolean;
  panelRoleCount: number;
  panelRoles: AdminUserPanelRole[];
  createdAt: string;
}

export interface AdminAccountUserPage {
  content: AdminAccountUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminRevokeResult {
  revokedSessions: number;
  affectedUsers: number;
  message?: string | null;
}

export type PaymentPurpose =
  | "PANEL_PURCHASE"
  | "PANEL_PLAN_UPDATE"
  | "COURSE_PURCHASE"
  | "WALLET_DEPOSIT";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface AdminPaymentOrder {
  id: number;
  amount: number | string;
  currency?: string | null;
  status: PaymentStatus | string;
  appCode?: AppCodeFilter | string | null;
  appNameFa?: string | null;
  purpose?: PaymentPurpose | string | null;
  purposeLabelFa?: string | null;
  productLabel?: string | null;
  planCode?: string | null;
  description?: string | null;
  panelId?: number | null;
  panelCode?: string | null;
  panelName?: string | null;
  managerUserId?: number | null;
  managerName?: string | null;
  managerPhone?: string | null;
  payerUserId?: number | null;
  payerName?: string | null;
  payerPhone?: string | null;
  gateway?: string | null;
  gatewayRef?: string | null;
  createdAt: string;
}

export interface AdminPaymentOrderPage {
  content: AdminPaymentOrder[];
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
