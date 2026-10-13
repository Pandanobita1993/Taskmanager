import { supabase } from './supabase';

export interface UserProfile {
  id?: string;
  authUserId?: string;
  fullName: string;
  department: string;
  additionalRoles: string[];
  isAdmin?: boolean;
  isSetupComplete: boolean;
  background?: string;
  storagePath?: string;
}

export const defaultProfile: UserProfile = {
  fullName: '',
  department: 'Kế toán',
  additionalRoles: [],
  isAdmin: false,
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

export async function loadCurrentProfile(): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Chưa đăng nhập');

  const { data, error } = await supabase
    .from('app_users')
    .select('id, auth_user_id, name, department, roles, is_admin, is_active')
    .eq('auth_user_id', authData.user.id)
    .single();

  if (error) throw error;
  if (!data.is_active) throw new Error('Tài khoản đã bị vô hiệu hóa');

  const cached = readCachedProfile();
  const profile: UserProfile = {
    id: data.id,
    authUserId: data.auth_user_id,
    fullName: data.name,
    department: data.department || 'Kế toán',
    additionalRoles: data.roles || [],
    isAdmin: Boolean(data.is_admin),
    isSetupComplete: true,
    background: cached.background || defaultProfile.background,
    storagePath: cached.storagePath,
  };
  cacheProfile(profile);
  return profile;
}
