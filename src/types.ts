export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  JUDGE = 'JUDGE',
  SCORER = 'SCORER',
  PARTICIPANT = 'PARTICIPANT',
  SUPERADMIN = 'SUPERADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN'
}

export enum CategoryType {
  ADULT_PUTRA = 'ADULT_PUTRA',
  ADULT_PUTRI = 'ADULT_PUTRI',
  U18_PUTRA = 'U18_PUTRA',
  U18_PUTRI = 'U18_PUTRI',
  U12_PUTRA = 'U12_PUTRA',
  U12_PUTRI = 'U12_PUTRI',
  U9_PUTRA = 'U9_PUTRA',
  U9_PUTRI = 'U9_PUTRI',
  OFFICIAL = 'OFFICIAL'
}

export enum PaymentType {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  GATEWAY = 'GATEWAY'
}

export enum TargetType {
  FACE_122 = 'FACE_122',
  FACE_80 = 'FACE_80',
  FACE_60 = 'FACE_60',
  FACE_40 = 'FACE_40',
  FACE_3X20 = 'FACE_3X20',
  STANDARD = 'STANDARD',
  PUTA = 'PUTA',
  TRADITIONAL_6_RING = 'TRADITIONAL_6_RING',
  TRADITIONAL_PUTA = 'TRADITIONAL_PUTA'
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  isOrganizer?: boolean;
  isSuperAdmin?: boolean;
  isVerified?: boolean;
  club?: string;
  phone?: string;
  role?: UserRole;
}

export interface GlobalSettings {
  feeAdult: number;
  feeKids: number;
  maintenanceMode: boolean;
  contactSupport: string;
  bankProvider: string;
  bankAccountNumber: string;
  bankAccountName: string;
  dataRetentionDays: number;
  practiceRetentionDays: number;
  paymentGatewayProvider: 'NONE' | 'MIDTRANS' | 'XENDIT';
  paymentGatewayIsProduction: boolean;
  paymentGatewayServerKey?: string;
  paymentGatewayClientKey?: string;
  platformFeePercentage: number;
  productionUrl?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  timestamp: number;
  read: boolean;
  recipientId?: string;
  senderId?: string;
}

export interface ScoreEntry {
  archerId: string;
  targetNo?: number;
  position?: string;
  wave?: number;
  scores?: number[];
  total: number;
  hits?: number;
  bulls?: number;
  timestamp?: number;
  scorerId?: string;
  sessionId?: string | number;
  endIndex?: number;
  count6?: number;
  count5?: number;
  arrows?: (number | "X")[];
  lastUpdated?: number;
  isDeleted?: boolean;
}

export interface ScoreLog {
  id: string;
  archerId: string;
  oldScores?: number[];
  newScores?: number[];
  timestamp: number;
  reason: string;
  adminId?: string;
  sessionId?: string | number;
  oldTotal?: number;
  newTotal?: number;
  operatorName?: string;
  endIndex?: number;
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONFIRMED = 'CONFIRMED'
}

export interface ParticipantRegistration {
  id: string;
  registrationNo?: string;
  name: string;
  email: string;
  phone?: string;
  club: string;
  category: string;
  status: RegistrationStatus;
  paymentProof?: string;
  paymentProofUrl?: string;
  timestamp?: number;
  totalPaid?: number;
  platformFee?: number;
  paymentType?: string;
  regType?: 'ARCHER' | 'OFFICIAL';
  _syncPending?: boolean;
}

export interface Archer extends ParticipantRegistration {
  targetNo: number;
  position: string;
  wave: number;
  pin: string;
  phone?: string;
  eventId?: string;
  totalPaid?: number;
  platformFee?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface Match {
  id: string;
  category: string;
  round: string;
  matchNo?: number;
  archerAId?: string;
  archerBId?: string;
  scoreA: number;
  scoreB: number;
  endsA: number[];
  endsB: number[];
  winnerId?: string;
  status: 'PENDING' | 'LIVE' | 'COMPLETED';
}

export interface CategoryConfig {
  registrationFee: number;
  distance: string;
  arrows: number;
  ends: number;
  targetType: TargetType;
  // Konfigurasi Aduan/Eliminasi
  h2hStartSize: 2 | 4 | 8 | 16 | 32 | 0; // 0 berarti tidak ada aduan
  eliminationStages: number[]; // Contoh: [32, 16] berarti ada penyaringan skor top 32 lalu top 16 baru masuk aduan
}

export interface Sponsorship {
  id: string;
  name: string;
  title: string;
  logoUrl?: string;
  videoUrl?: string;
}

export interface TournamentSettings {
  tournamentName: string;
  organizerId: string;
  isPractice?: boolean;
  archersPerTarget: number;
  totalTargets: number;
  totalArrows: number;
  arrowsPerEnd: number;
  totalEnds: number;
  thbLink?: string;
  platformFeePaidToOwner?: boolean;
  location?: string;
  eventDate?: string;
  executionTime?: string;
  isFreeEvent?: boolean;
  isActivated?: boolean;
  isConfirmed?: boolean;
  activationCode?: string;
  description?: string;
  registrationDeadline?: string;
  createdAt?: number;
  paymentMethods?: any[];
  pamphletUrl?: string;
  thbUrl?: string;
  enableGateway?: boolean;
  officialFee?: number;
  categoryConfigs?: Partial<Record<CategoryType, CategoryConfig>>;
  waGroupLink?: string;
  lastResetAt?: number;
  sponsorships?: Sponsorship[];
}

export interface DisbursementRequest {
  id: string;
  organizerId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
}

export interface ArcheryEvent {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ONGOING' | 'UPCOMING';
  settings: TournamentSettings;
  archers: Archer[];
  officials?: ParticipantRegistration[];
  registrations: ParticipantRegistration[];
  scores: ScoreEntry[];
  scoreLogs: ScoreLog[];
  matches: Record<CategoryType, Match[]>;
  scorerAccess?: any;
  disbursementRequests?: DisbursementRequest[];
  ownerId?: string;
  localUpdatedAt?: string;
  isSharded?: boolean;
  registrationCount?: number;
  officialCount?: number;
}

export interface AppState {
  events: ArcheryEvent[];
  users: User[];
  currentUser: User | null;
  activeEventId: string | null;
  globalSettings: GlobalSettings;
  notifications: AppNotification[];
  isDataLoaded?: boolean;
  activeScorer?: any;
  submissions?: any[];
  shards?: any[];
  drafts?: {
    scoring?: Record<string, (number | 'X')[]>; // key: archerId_endIndex
    adminSettings?: Record<string, TournamentSettings>; // key: eventId
    activeCategory?: Record<string, CategoryType>; // key: viewName
  };
}

export interface PaymentMethod {
  id: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  type?: PaymentType;
}

export type ScorerAccess = {
  id: string;
  name: string;
  pin: string;
  eventId?: string;
  accessCode?: string;
  permissions?: string[];
};
