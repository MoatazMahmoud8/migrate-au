// Points Calculator Types
export type VisaSubclass = '189' | '190' | '491';

export type EnglishLevel = 'competent' | 'proficient' | 'superior';

export interface PointsInput {
  age: number;
  englishLevel: EnglishLevel;
  australianWorkYears: number;
  overseasWorkYears: number;
  visaSubclass: VisaSubclass;
  hasPartnerSkills: boolean;
  hasPartnerSuperiorEnglish: boolean;
  hasProfessionalYear: boolean;
  hasNaati: boolean;
  hasStateNomination: boolean;
  hasCommunityLanguage: boolean;
  hasAustralianStudy: boolean;
}

export interface PointsBreakdown {
  age: number;
  english: number;
  australianWork: number;
  overseasWork: number;
  partner: number;
  stateNomination: number;
  professionalYear: number;
  naati: number;
  communityLanguage: number;
  australianStudy: number;
  total: number;
  likelyEligible: boolean;
}

// News / Firestore types
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  state: string;
  publishedAt: Date;
  source: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Journey tracker
export type JourneyStageKey = 'assess' | 'eoi' | 'invite' | 'apply' | 'grant';
export type JourneyVisaType = '189' | '190' | '491' | '186' | '482' | '408' | 'Other';

export interface JourneyEntry {
  id: string;
  visaType: JourneyVisaType;
  anzscoCode?: string;
  occupationName?: string;
  state?: string;            // state code e.g. 'NSW', or undefined for federal
  currentStage: number;     // 0–4 index into JOURNEY_STAGES
  stageDates: Partial<Record<JourneyStageKey, string>>; // ISO date strings
  createdAt: string;
}

// Profile
export interface UserProfile {
  name: string;
  anzscoCode: string;
  isPremium: boolean;
  subscribedStates: string[];
  subscribedOccupation: string;
  journeyStage: number;
  journeyEntries: JourneyEntry[];
  pinnedStates: string[];
  onboardingComplete: boolean;
}
