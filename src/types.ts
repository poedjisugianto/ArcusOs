export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  JUDGE = 'JUDGE',
  SCORER = 'SCORER',
  PARTICIPANT = 'PARTICIPANT',
  SUPERADMIN = 'SUPERADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN'
}

export enum TargetType {
  FACE_122 = 'FACE_122',
  FACE_80 = 'FACE_80',
  FACE_60 = 'FACE_60',
  FACE_40 = 'FACE_40',
  FACE_3X20 = 'FACE_3X20',
  STANDARD = 'STANDARD',
  PUTA = 'PUTA'
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

export interface ParticipantRegistration {
  id: string;
  registrationNo?: string;
  name: string;
  email: string;
  club: string;
  category: string;
  status: 'PENDING' | 'PAID' | 'APPROVED' | 'REJECTED' | 'CONFIRMED';
  paymentProof?: string;
  paymentProofUrl?: string;
  timestamp?: number;
  totalPaid?: number;
  platformFee?: number;
  paymentType?: string;
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
}

export interface TournamentSettings {
  tournamentName: string;
  organizerId: string;
  isPractice?: boolean;
  isSelfPractice?: boolean;
  archersPerTarget: number;
  totalTargets: number;
  totalArrows: number;
  arrowsPerEnd: number;
  totalEnds: number;
  thbLink?: string;
  platformFeePaidToOwner?: boolean;
  location?: string;
  eventDate?: string;
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
  selfPracticeEnds?: number;
  selfPracticeArrows?: number;
  selfPracticeDistance?: number;
  selfPracticeTargetType?: TargetType;
  categoryConfigs?: Partial<Record<CategoryType, CategoryConfig>>;
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
  registrations: ParticipantRegistration[];
  scores: ScoreEntry[];
  scoreLogs: ScoreLog[];
  matches: Record<CategoryType, Match[]>;
  scorerAccess?: any;
  disbursementRequests?: DisbursementRequest[];
}

export interface AppState {
  events: ArcheryEvent[];
  users: User[];
  currentUser: User | null;
  activeEventId: string | null;
  globalSettings: GlobalSettings;
  notifications: AppNotification[];
  activeScorer?: any;
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
