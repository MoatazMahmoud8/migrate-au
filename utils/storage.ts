import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../constants/types';

const PROFILE_KEY = '@migrate_au_profile';

// DEV: Force premium for local testing
const DEV_PREMIUM = __DEV__;

const defaultProfile: UserProfile = {
  name: '',
  anzscoCode: '',
  isPremium: DEV_PREMIUM,
  subscribedStates: [],
  subscribedOccupation: '',
  journeyStage: 0,
  journeyEntries: [],
  pinnedStates: [],
  onboardingComplete: false,
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (!json) return defaultProfile;
    const stored = { ...defaultProfile, ...JSON.parse(json) };
    // In dev mode, always grant premium access
    if (DEV_PREMIUM) stored.isPremium = true;
    return stored;
  } catch {
    return defaultProfile;
  }
}

export async function saveProfile(profile: Partial<UserProfile>): Promise<void> {
  const current = await getProfile();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...profile }));
}
