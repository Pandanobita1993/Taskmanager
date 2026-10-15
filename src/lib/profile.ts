import { DEFAULT_OFFICE } from './offices';

export interface UserProfile {
  id?: string;
  fullName: string;
  department: string;
  office?: string;
  additionalRoles: string[];
  isSetupComplete: boolean;
  background?: string;
  storagePath?: string;
}

export const defaultProfile: UserProfile = {
  fullName: '',
  department: 'Kế toán',
  office: DEFAULT_OFFICE,
  additionalRoles: [],
  isSetupComplete: false,
  background: 'bg-gray-50',
};

export const PROFILE_CACHE_KEY = 'task_manager_profile';

export function readCachedProfile(): UserProfile {
  try {
    const value = localStorage.getItem(PROFILE_CACHE_KEY);
    return value ? { ...defaultProfile, ...JSON.parse(value) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function cacheProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event('taskflow-profile-changed'));
}
