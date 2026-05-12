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

// Profile
export interface UserProfile {
  name: string;
  anzscoCode: string;
  isPremium: boolean;
  subscribedStates: string[];
  subscribedOccupation: string;
  journeyStage: number;
  pinnedStates: string[];
  onboardingComplete: boolean;
}
