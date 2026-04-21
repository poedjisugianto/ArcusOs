import { TournamentSettings, TargetType } from './types';

export const STORAGE_KEY = 'arcus_digital_archery_v1';
export const APP_VERSION = '1.2.0';

export const DEFAULT_SETTINGS: TournamentSettings = {
  tournamentName: '',
  organizerId: '',
  archersPerTarget: 4,
  totalTargets: 20,
  totalArrows: 36,
  arrowsPerEnd: 6,
  totalEnds: 6,
  isPractice: false,
  isFreeEvent: false,
  paymentMethods: [],
  categoryConfigs: {}
};

export const CATEGORY_LABELS: Record<string, string> = {
  'ADULT_PUTRA': 'Dewasa Putra',
  'ADULT_PUTRI': 'Dewasa Putri',
  'U18_PUTRA': 'U18 Putra',
  'U18_PUTRI': 'U18 Putri',
  'U12_PUTRA': 'U12 Putra',
  'U12_PUTRI': 'U12 Putri',
  'U9_PUTRA': 'U9 Putra',
  'U9_PUTRI': 'U9 Putri',
  'OFFICIAL': 'Official (Manager/Pelatih)'
};
