import { format, subDays } from 'date-fns';
import { localDateKey } from './date';
import type { UserProfile } from './profile';

export type MascotType = 'capybara';

export type MascotMood = 'fire' | 'coffee' | 'zen' | 'sleepy';

export type MascotAccessoryId =
  | 'none'
  | 'glasses'
  | 'coffee'
  | 'headband'
  | 'hardhat'
  | 'crown';

export type MascotExpression =
  | 'chill'
  | 'happy'
  | 'working'
  | 'alert'
  | 'celebrating'
  | 'sleeping'
  | 'coffee';

export interface MascotAttendanceRecord {
  date: string; // yyyy-MM-dd
  checkInTime: string; // HH:mm
  checkOutTime?: string; // HH:mm
  mood: MascotMood;
}

export interface MascotState {
  mascotType: MascotType;
  petName: string;
  tangerines: number; // Điểm "Quýt vàng"
  streak: number;
  lastCheckInDate: string | null;
  todayRecord: MascotAttendanceRecord | null;
  unlockedAccessories: MascotAccessoryId[];
  equippedAccessory: MascotAccessoryId;
  completedRewardsToday: number;
}

export interface MascotTaskStats {
  pendingCount: number;
  urgentCount: number;
  completedTodayCount: number;
}

export interface MascotMoodOption {
  id: MascotMood;
  emoji: string;
  label: string;
  shortLabel: string;
}

export interface MascotAccessoryOption {
  id: MascotAccessoryId;
  name: string;
  emoji: string;
  cost: number;
  description: string;
}

export const MASCOT_MOODS: MascotMoodOption[] = [
  { id: 'fire', emoji: '🔥', label: 'Hừng hực khí thế', shortLabel: 'Khí thế' },
  { id: 'coffee', emoji: '🧋', label: 'Cần ly cà phê / trà sữa', shortLabel: 'Cần cà phê' },
  { id: 'zen', emoji: '🧘', label: 'Tâm tịnh gánh deadline', shortLabel: 'Thư thái' },
  { id: 'sleepy', emoji: '😪', label: 'Hơi ngái ngủ xíu', shortLabel: 'Buồn ngủ' },
];

export const MASCOT_ACCESSORIES: MascotAccessoryOption[] = [
  { id: 'none', name: 'Quả quýt nhỏ', emoji: '🍊', cost: 0, description: 'Biểu tượng bất hủ của Capybara' },
  { id: 'glasses', name: 'Kính kế toán', emoji: '👓', cost: 20, description: 'Soi số liệu chuẩn từng đồng' },
  { id: 'headband', name: 'Băng đô quyết thắng', emoji: '🎀', cost: 30, description: 'Chạy deadline không biết mệt' },
  { id: 'coffee', name: 'Ly cà phê sữa', emoji: '🧋', cost: 35, description: 'Nạp năng lượng buổi sáng' },
  { id: 'hardhat', name: 'Nón bảo hộ', emoji: '⛑️', cost: 50, description: 'Chống va đập mùa quyết toán' },
  { id: 'crown', name: 'Vương miện gánh team', emoji: '👑', cost: 80, description: 'Đẳng cấp chiến thần sổ sách' },
];

export const MASCOT_CELEBRATE_EVENT = 'taskflow-mascot-celebrate';
export const MASCOT_STATS_EVENT = 'taskflow-mascot-stats';

const STORAGE_PREFIX = 'taskflow_mascot_v1_';

export function getMascotUserKey(profile: Pick<UserProfile, 'id' | 'fullName'> | null | undefined): string {
  const raw = profile?.id || profile?.fullName || 'guest';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export function createDefaultMascotState(staffName?: string): MascotState {
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
  return {
    mascotType: 'capybara',
    petName: shortName ? `Bé Quýt (${shortName})` : 'Bé Quýt',
    tangerines: 10,
    streak: 0,
    lastCheckInDate: null,
    todayRecord: null,
    unlockedAccessories: ['none'],
    equippedAccessory: 'none',
    completedRewardsToday: 0,
  };
}

function normalizeStateForToday(state: MascotState): MascotState {
  const today = localDateKey();
  const yesterday = localDateKey(subDays(new Date(), 1));

  let next = { ...state };
  if (next.todayRecord && next.todayRecord.date !== today) {
    next.todayRecord = null;
    next.completedRewardsToday = 0;
  }

  if (next.lastCheckInDate && next.lastCheckInDate !== today && next.lastCheckInDate !== yesterday) {
    next.streak = 0;
  }

  if (!Array.isArray(next.unlockedAccessories) || !next.unlockedAccessories.includes('none')) {
    next.unlockedAccessories = ['none', ...(next.unlockedAccessories || [])];
  }

  return next;
}

export function loadMascotState(userKey: string, staffName?: string): MascotState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userKey}`);
    if (!raw) return createDefaultMascotState(staffName);
    const parsed = JSON.parse(raw) as Partial<MascotState>;
    const merged: MascotState = {
      ...createDefaultMascotState(staffName),
      ...parsed,
    };
    return normalizeStateForToday(merged);
  } catch {
    return createDefaultMascotState(staffName);
  }
}

export function saveMascotState(userKey: string, state: MascotState): MascotState {
  const normalized = normalizeStateForToday(state);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userKey}`, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota errors
  }
  return normalized;
}

export function checkInMascot(userKey: string, mood: MascotMood, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const today = localDateKey();
  const yesterday = localDateKey(subDays(new Date(), 1));
  const nowTime = format(new Date(), 'HH:mm');

  if (current.todayRecord?.date === today) {
    // Đã điểm danh hôm nay -> chỉ cập nhật tâm trạng hoặc mở lại ca nếu trước đó đã check-out
    const next: MascotState = {
      ...current,
      todayRecord: {
        ...current.todayRecord,
        mood,
        checkOutTime: undefined,
      },
    };
    return saveMascotState(userKey, next);
  }

  const nextStreak = current.lastCheckInDate === yesterday ? current.streak + 1 : 1;
  const streakBonus = nextStreak > 0 && nextStreak % 5 === 0 ? 10 : 0;

  const next: MascotState = {
    ...current,
    streak: nextStreak,
    lastCheckInDate: today,
    tangerines: current.tangerines + 10 + streakBonus,
    todayRecord: {
      date: today,
      checkInTime: nowTime,
      mood,
    },
  };

  return saveMascotState(userKey, next);
}

export function checkOutMascot(userKey: string, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const today = localDateKey();
  const nowTime = format(new Date(), 'HH:mm');

  if (!current.todayRecord || current.todayRecord.date !== today) {
    return current;
  }

  const alreadyCheckedOut = Boolean(current.todayRecord.checkOutTime);
  const next: MascotState = {
    ...current,
    tangerines: alreadyCheckedOut ? current.tangerines : current.tangerines + 5,
    todayRecord: {
      ...current.todayRecord,
      checkOutTime: nowTime,
    },
  };

  return saveMascotState(userKey, next);
}

export function updateMascotMood(userKey: string, mood: MascotMood, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const today = localDateKey();
  if (!current.todayRecord || current.todayRecord.date !== today) return current;

  return saveMascotState(userKey, {
    ...current,
    todayRecord: {
      ...current.todayRecord,
      mood,
    },
  });
}

export function renameMascot(userKey: string, petName: string, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const trimmed = petName.trim().slice(0, 28);
  if (!trimmed) return current;
  return saveMascotState(userKey, { ...current, petName: trimmed });
}

export function rewardTaskCompleted(userKey: string, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const next: MascotState = {
    ...current,
    tangerines: current.tangerines + 5,
    completedRewardsToday: current.completedRewardsToday + 1,
  };
  return saveMascotState(userKey, next);
}

export function unlockOrEquipAccessory(
  userKey: string,
  accessoryId: MascotAccessoryId,
  staffName?: string
): { state: MascotState; ok: boolean; reason?: string } {
  const current = loadMascotState(userKey, staffName);
  const option = MASCOT_ACCESSORIES.find((a) => a.id === accessoryId);
  if (!option) return { state: current, ok: false, reason: 'Không tìm thấy phụ kiện' };

  if (current.unlockedAccessories.includes(accessoryId)) {
    const updated = saveMascotState(userKey, {
      ...current,
      equippedAccessory: accessoryId,
    });
    return { state: updated, ok: true };
  }

  if (current.tangerines < option.cost) {
    return {
      state: current,
      ok: false,
      reason: `Cần ${option.cost} Quýt vàng để mở khóa (hiện có ${current.tangerines} 🍊)`,
    };
  }

  const updated = saveMascotState(userKey, {
    ...current,
    tangerines: current.tangerines - option.cost,
    unlockedAccessories: [...current.unlockedAccessories, accessoryId],
    equippedAccessory: accessoryId,
  });
  return { state: updated, ok: true };
}

export function resolveMascotExpression(
  state: MascotState,
  stats: MascotTaskStats,
  isCelebrating: boolean
): MascotExpression {
  if (isCelebrating) return 'celebrating';
  if (state.todayRecord?.checkOutTime) return 'sleeping';
  if (stats.urgentCount > 0) return 'alert';
  if (!state.todayRecord) return 'happy';
  if (state.todayRecord.mood === 'coffee') return 'coffee';
  if (state.todayRecord.mood === 'sleepy') return 'sleeping';
  if (stats.pendingCount === 0) return 'chill';
  return 'working';
}

export function getMascotSpeech(
  state: MascotState,
  stats: MascotTaskStats,
  isCelebrating: boolean,
  staffName?: string,
  celebrateTaskTitle?: string
): string {
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0] || 'bồ';

  if (isCelebrating) {
    if (celebrateTaskTitle) {
      return `10 điểm không có nhưng! Xong việc "${celebrateTaskTitle.slice(0, 34)}${celebrateTaskTitle.length > 34 ? '...' : ''}" rồi (+5 🍊)! 🎉`;
    }
    return `Tuyệt vời ${shortName} ơi! Xong thêm 1 việc rồi, nhận +5 Quýt vàng nè! 🎉`;
  }

  if (state.todayRecord?.checkOutTime) {
    return `Hết ca lúc ${state.todayRecord.checkOutTime} rồi! Hôm nay ${shortName} làm rất tốt, đi sạc pin thôi nào 💤`;
  }

  if (!state.todayRecord) {
    if (stats.urgentCount > 0) {
      return `Chào ${shortName}! Hôm nay có ${stats.urgentCount} việc GẤP đang chờ đó, bấm Điểm danh vào ca liền nhen! 🔥`;
    }
    return `Chào buổi sáng ${shortName}! Nhấn vào mình để điểm danh vào ca nhận +10 Quýt vàng nào 🍊`;
  }

  if (stats.urgentCount > 0) {
    return `${shortName} ơi, đang có ${stats.urgentCount} việc GẤP cần ưu tiên xử lý trước nè! Cố lên nha 💪`;
  }

  if (stats.pendingCount === 0) {
    return `Quá đỉnh ${shortName} ơi! Sạch bóng việc chờ xử lý rồi, ngồi chill uống trà cùng mình nhé 🍵`;
  }

  if (state.todayRecord.mood === 'coffee') {
    return `Làm một ngụm cà phê cho tỉnh táo rồi dọn ${stats.pendingCount} việc đang chờ nha ${shortName}! ☕`;
  }

  return `Đang vào ca mượt mà! Còn ${stats.pendingCount} việc đang xử lý, từ từ gỡ từng khách hàng nhen ${shortName} ✨`;
}

export function dispatchMascotCelebrate(taskTitle?: string) {
  window.dispatchEvent(new CustomEvent(MASCOT_CELEBRATE_EVENT, { detail: { taskTitle } }));
}

export function dispatchMascotStats(stats: MascotTaskStats) {
  window.dispatchEvent(new CustomEvent(MASCOT_STATS_EVENT, { detail: stats }));
}
