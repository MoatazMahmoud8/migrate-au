import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../constants/types';

const PROFILE_KEY = '@migrate_au_profile';

const defaultProfile: UserProfile = {
  name: '',
  anzscoCode: '',
  isPremium: false,
  subscribedStates: [],
  subscribedOccupation: '',
  journeyStage: 0,
  pinnedStates: [],
  onboardingComplete: false,
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (!json) return defaultProfile;
    return { ...defaultProfile, ...JSON.parse(json) };
  } catch {
    return defaultProfile;
  }
}

export async function saveProfile(profile: Partial<UserProfile>): Promise<void> {
  const current = await getProfile();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...profile }));
}
