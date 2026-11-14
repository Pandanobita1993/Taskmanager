import { format, subDays } from 'date-fns';
import { localDateKey } from './date';
import type { UserProfile } from './profile';

export type MascotType =
  | 'capybara'
  | 'rat'
  | 'buffalo'
  | 'tiger'
  | 'cat'
  | 'dragon'
  | 'snake'
  | 'horse'
  | 'goat'
  | 'monkey'
  | 'rooster'
  | 'dog'
  | 'pig'
  | 'panda'
  | 'fox'
  | 'rabbit'
  | 'penguin'
  | 'frog';

export interface MascotSpeciesOption {
  id: MascotType;
  name: string;
  emoji: string;
  defaultPetName: string;
  tagline: string;
}

export const MASCOT_SPECIES: MascotSpeciesOption[] = [
  { id: 'capybara', name: 'Capybara', emoji: '🍊', defaultPetName: 'Bé Quýt', tagline: 'Bất biến giữa dòng đời deadline' },
  { id: 'rat', name: 'Tý · Chuột', emoji: '🐭', defaultPetName: 'Bé Tý', tagline: 'Nhanh nhẹn gom đủ chứng từ' },
  { id: 'buffalo', name: 'Sửu · Trâu', emoji: '🐃', defaultPetName: 'Bé Sửu', tagline: 'Chăm chỉ cày báo cáo không mệt' },
  { id: 'tiger', name: 'Dần · Hổ', emoji: '🐯', defaultPetName: 'Bé Dần', tagline: 'Oai phong chốt sổ cái rụp' },
  { id: 'cat', name: 'Mão · Mèo', emoji: '🐱', defaultPetName: 'Bé Mèo', tagline: 'Tinh mắt soi số liệu chuẩn từng xu' },
  { id: 'dragon', name: 'Thìn · Rồng', emoji: '🐲', defaultPetName: 'Bé Thìn', tagline: 'Rồng con phun lửa xử lý việc gấp' },
  { id: 'snake', name: 'Tỵ · Rắn', emoji: '🐍', defaultPetName: 'Bé Tỵ', tagline: 'Khéo léo gỡ rối từng hồ sơ khó' },
  { id: 'horse', name: 'Ngọ · Ngựa', emoji: '🐴', defaultPetName: 'Bé Ngọ', tagline: 'Phi nước đại cán đích đúng hạn' },
  { id: 'goat', name: 'Mùi · Dê', emoji: '🐐', defaultPetName: 'Bé Dê', tagline: 'Cỏ 4 lá mang lại suôn sẻ cả ngày' },
  { id: 'monkey', name: 'Thân · Khỉ', emoji: '🐵', defaultPetName: 'Bé Thân', tagline: 'Lanh lợi xử lý đa nhiệm cực mượt' },
  { id: 'rooster', name: 'Dậu · Gà', emoji: '🐔', defaultPetName: 'Bé Dậu', tagline: 'Đúng giờ điểm danh không trễ một giây' },
  { id: 'dog', name: 'Tuất · Chó', emoji: '🐶', defaultPetName: 'Bé Tuất', tagline: 'Trung thành đồng hành cùng đồng đội' },
  { id: 'pig', name: 'Hợi · Heo', emoji: '🐷', defaultPetName: 'Bé Hợi', tagline: 'Sung túc viên mãn cả tháng' },
  { id: 'panda', name: 'Gấu trúc', emoji: '🐼', defaultPetName: 'Bé Trúc', tagline: 'Nhẩn nha nhai lá trúc, việc khó cứ từ từ' },
  { id: 'fox', name: 'Cáo nhỏ', emoji: '🦊', defaultPetName: 'Bé Cáo', tagline: 'Lanh lợi bắt trend, xử lý hồ sơ siêu tốc' },
  { id: 'rabbit', name: 'Thỏ ngọc', emoji: '🐰', defaultPetName: 'Bé Thỏ', tagline: 'Đáng yêu hết nấc, chạy deadline nhẹ tựa lông hồng' },
  { id: 'penguin', name: 'Cánh cụt', emoji: '🐧', defaultPetName: 'Bé Cánh Cụt', tagline: 'Lạnh lùng giữa bão task, giữ vững phong độ' },
  { id: 'frog', name: 'Ếch xanh', emoji: '🐸', defaultPetName: 'Bé Ếch', tagline: 'Thư thái ngồi lá sen, mọi việc đều suôn sẻ' },
];

export type MascotMood = 'fire' | 'coffee' | 'zen' | 'sleepy';

export type MascotVariant = 'default' | 'feminine';

export type MascotAccessoryId =
  | 'none'
  | 'bucket_hat'
  | 'sunglasses'
  | 'crown'
  | 'nerd_glasses'
  | 'boba_tea';

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

export interface MascotEggIncubation {
  hatched: boolean;
  streakDays: number;
  targetDays: number;
  lastOnTimeDate: string | null;
  hatchedAt?: string;
}

export interface MascotState {
  mascotType: MascotType;
  mascotVariant?: MascotVariant;
  petName: string;
  tangerines: number; // Điểm "Quýt vàng"
  streak: number;
  lastCheckInDate: string | null;
  todayRecord: MascotAttendanceRecord | null;
  unlockedAccessories: MascotAccessoryId[];
  equippedAccessory: MascotAccessoryId;
  completedRewardsToday: number;
  eggIncubation?: MascotEggIncubation;
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
  { id: 'none', name: 'Không đeo', emoji: '✨', cost: 0, description: 'Giữ nguyên nét dễ thương nguyên bản' },
  { id: 'bucket_hat', name: 'Nón tai bèo TNXP', emoji: '🪖', cost: 25, description: 'Xanh thanh niên xung phong gắn quốc kỳ đỏ sao vàng' },
  { id: 'sunglasses', name: 'Kính râm ngầu lòi', emoji: '🕶️', cost: 30, description: 'Cặp kính râm đen chuẩn dân chơi gánh deadline' },
  { id: 'crown', name: 'Vương miện công chúa', emoji: '👑', cost: 60, description: 'Lấp lánh kiêu sa đẳng cấp hoàng gia' },
  { id: 'nerd_glasses', name: 'Kính cận lòi trĩ', emoji: '🤓', cost: 35, description: 'Kính tròn xoáy ốc soi từng dấu phẩy số liệu' },
  { id: 'boba_tea', name: 'Ly trà sữa', emoji: '🧋', cost: 40, description: 'Trà sữa trân châu đường đen tiếp sức cả ngày' },
];

const VALID_ACCESSORY_IDS = new Set<string>(MASCOT_ACCESSORIES.map((a) => a.id));

export const MASCOT_CELEBRATE_EVENT = 'taskflow-mascot-celebrate';
export const MASCOT_STATS_EVENT = 'taskflow-mascot-stats';

const STORAGE_PREFIX = 'taskflow_mascot_v1_';

export function getMascotUserKey(profile: Pick<UserProfile, 'id' | 'fullName'> | null | undefined): string {
  const raw = profile?.id || profile?.fullName || 'guest';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export const EGG_INCUBATION_DAYS = 5;
export const ON_TIME_CHECKIN_CUTOFF = '08:05';

export function pickRandomMascotForUser(userKey: string): MascotType {
  let hash = 2166136261;
  for (let i = 0; i < userKey.length; i++) {
    hash ^= userKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % MASCOT_SPECIES.length;
  return MASCOT_SPECIES[idx].id;
}

export function createDefaultMascotState(staffName?: string, userKey?: string): MascotState {
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
  const mascotType = userKey ? pickRandomMascotForUser(userKey) : 'capybara';
  return {
    mascotType,
    mascotVariant: 'default',
    petName: shortName ? `🥚 Trứng bí ẩn (${shortName})` : '🥚 Trứng bí ẩn',
    tangerines: 10,
    streak: 0,
    lastCheckInDate: null,
    todayRecord: null,
    unlockedAccessories: ['none'],
    equippedAccessory: 'none',
    completedRewardsToday: 0,
    eggIncubation: {
      hatched: false,
      streakDays: 0,
      targetDays: EGG_INCUBATION_DAYS,
      lastOnTimeDate: null,
    },
  };
}

function isConsecutiveWorkday(prevDate: string | null, todayDate: string): boolean {
  if (!prevDate) return false;
  const now = new Date();
  const yesterday = localDateKey(subDays(now, 1));
  if (prevDate === yesterday || prevDate === todayDate) return true;
  // Nếu hôm nay là Thứ 2 (getDay() === 1), chấp nhận Thứ 6 hoặc Thứ 7 tuần trước là liên tiếp
  if (now.getDay() === 1) {
    const friday = localDateKey(subDays(now, 3));
    const saturday = localDateKey(subDays(now, 2));
    return prevDate === friday || prevDate === saturday;
  }
  return false;
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

  if (next.eggIncubation && !next.eggIncubation.hatched) {
    const last = next.eggIncubation.lastOnTimeDate;
    if (last && !isConsecutiveWorkday(last, today)) {
      next.eggIncubation = {
        ...next.eggIncubation,
        streakDays: 0,
        lastOnTimeDate: null,
      };
    }
  }

  const filteredUnlocked = Array.isArray(next.unlockedAccessories)
    ? next.unlockedAccessories.filter((id) => VALID_ACCESSORY_IDS.has(id))
    : [];
  next.unlockedAccessories = filteredUnlocked.includes('none')
    ? filteredUnlocked
    : ['none', ...filteredUnlocked];

  if (!VALID_ACCESSORY_IDS.has(next.equippedAccessory)) {
    next.equippedAccessory = 'none';
  }

  return next;
}

export function loadMascotState(userKey: string, staffName?: string): MascotState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userKey}`);
    if (!raw) return createDefaultMascotState(staffName, userKey);
    const parsed = JSON.parse(raw) as Partial<MascotState>;
    const legacyEgg: MascotEggIncubation | undefined = parsed.eggIncubation
      ? parsed.eggIncubation
      : {
          hatched: true,
          streakDays: EGG_INCUBATION_DAYS,
          targetDays: EGG_INCUBATION_DAYS,
          lastOnTimeDate: parsed.lastCheckInDate || null,
        };
    const merged: MascotState = {
      ...createDefaultMascotState(staffName, userKey),
      ...parsed,
      eggIncubation: legacyEgg,
    };
    return normalizeStateForToday(merged);
  } catch {
    return createDefaultMascotState(staffName, userKey);
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

  let nextEgg = current.eggIncubation;
  let hatchBonus = 0;
  let nextPetName = current.petName;
  if (nextEgg && !nextEgg.hatched) {
    const isOnTime = nowTime <= ON_TIME_CHECKIN_CUTOFF;
    if (isOnTime) {
      const nextEggStreak = isConsecutiveWorkday(nextEgg.lastOnTimeDate, today)
        ? nextEgg.streakDays + 1
        : 1;
      const justHatched = nextEggStreak >= nextEgg.targetDays;
      if (justHatched) {
        hatchBonus = 20;
        if (current.petName.includes('Trứng bí ẩn')) {
          const species = MASCOT_SPECIES.find((s) => s.id === current.mascotType) || MASCOT_SPECIES[0];
          const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
          nextPetName = shortName ? `${species.defaultPetName} (${shortName})` : species.defaultPetName;
        }
      }
      nextEgg = {
        ...nextEgg,
        streakDays: Math.min(nextEggStreak, nextEgg.targetDays),
        lastOnTimeDate: today,
        hatched: justHatched,
        hatchedAt: justHatched ? today : undefined,
      };
    } else {
      nextEgg = {
        ...nextEgg,
        streakDays: 0,
        lastOnTimeDate: null,
      };
    }
  }

  const next: MascotState = {
    ...current,
    petName: nextPetName,
    streak: nextStreak,
    lastCheckInDate: today,
    tangerines: current.tangerines + 10 + streakBonus + hatchBonus,
    eggIncubation: nextEgg,
    todayRecord: {
      date: today,
      checkInTime: nowTime,
      mood,
    },
  };

  return saveMascotState(userKey, next);
}

export function resetEggIncubation(userKey: string, staffName?: string): MascotState {
  const current = loadMascotState(userKey, staffName);
  const randomSpecies = MASCOT_SPECIES[Math.floor(Math.random() * MASCOT_SPECIES.length)];
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
  return saveMascotState(userKey, {
    ...current,
    mascotType: randomSpecies.id,
    petName: shortName ? `🥚 Trứng bí ẩn (${shortName})` : '🥚 Trứng bí ẩn',
    eggIncubation: {
      hatched: false,
      streakDays: 0,
      targetDays: EGG_INCUBATION_DAYS,
      lastOnTimeDate: null,
    },
  });
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

export function changeMascotType(
  userKey: string,
  mascotType: MascotType,
  staffName?: string
): MascotState {
  const current = loadMascotState(userKey, staffName);
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
  const species = MASCOT_SPECIES.find((s) => s.id === mascotType) || MASCOT_SPECIES[0];
  const isDefaultName = MASCOT_SPECIES.some((s) => {
    const withStaff = shortName ? `${s.defaultPetName} (${shortName})` : s.defaultPetName;
    return current.petName === s.defaultPetName || current.petName === withStaff;
  });
  const nextPetName = isDefaultName
    ? shortName
      ? `${species.defaultPetName} (${shortName})`
      : species.defaultPetName
    : current.petName;

  return saveMascotState(userKey, {
    ...current,
    mascotType,
    petName: nextPetName,
  });
}

export function changeMascotVariant(
  userKey: string,
  mascotVariant: MascotVariant,
  staffName?: string
): MascotState {
  const current = loadMascotState(userKey, staffName);
  return saveMascotState(userKey, {
    ...current,
    mascotVariant,
  });
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
  const isGoat = state.mascotType === 'goat';

  if (state.eggIncubation && !state.eggIncubation.hatched) {
    const { streakDays, targetDays } = state.eggIncubation;
    if (!state.todayRecord) {
      return `🥚 Trứng linh vật đang chờ ấp nè ${shortName}! Điểm danh đúng/sớm giờ (≤ ${ON_TIME_CHECKIN_CUTOFF}) để ấp ngày ${Math.min(streakDays + 1, targetDays)}/${targetDays} nha ✨`;
    }
    if (state.todayRecord.checkInTime > ON_TIME_CHECKIN_CUTOFF) {
      return `🥚 Hôm nay điểm danh lúc ${state.todayRecord.checkInTime} (sau ${ON_TIME_CHECKIN_CUTOFF}) nên trứng bị nguội mất rồi, mai đi sớm ấp lại từ đầu nha ${shortName}!`;
    }
    const remaining = Math.max(0, targetDays - streakDays);
    return `🥚 Ấm quá đi~ Trứng đã ấp được ${streakDays}/${targetDays} ngày đúng giờ rồi! Còn ${remaining} ngày nữa là nở ra linh vật ngẫu nhiên nha ✨`;
  }

  if (isCelebrating) {
    if (celebrateTaskTitle) {
      return isGoat
        ? `Be beee~ Quá mượt ${shortName} ơi! Xong "${celebrateTaskTitle.slice(0, 30)}${celebrateTaskTitle.length > 30 ? '...' : ''}" rồi (+5 🍊)! 🍀`
        : `10 điểm không có nhưng! Xong việc "${celebrateTaskTitle.slice(0, 34)}${celebrateTaskTitle.length > 34 ? '...' : ''}" rồi (+5 🍊)! 🎉`;
    }
    return isGoat
      ? `Beee~ Cỏ 4 lá phù hộ, xong thêm 1 việc rồi nè ${shortName} (+5 🍊)! 🍀`
      : `Tuyệt vời ${shortName} ơi! Xong thêm 1 việc rồi, nhận +5 Quýt vàng nè! 🎉`;
  }

  if (state.todayRecord?.checkOutTime) {
    return isGoat
      ? `Be~ Hết ca lúc ${state.todayRecord.checkOutTime} rồi, ${shortName} về nghỉ ngơi lấy sức mai chiến tiếp nha 💤`
      : `Hết ca lúc ${state.todayRecord.checkOutTime} rồi! Hôm nay ${shortName} làm rất tốt, đi sạc pin thôi nào 💤`;
  }

  if (!state.todayRecord) {
    if (stats.urgentCount > 0) {
      return isGoat
        ? `Beee ${shortName} ơi! Hôm nay có ${stats.urgentCount} việc GẤP đó, bấm Điểm danh nhận may mắn liền nhen! 🍀🔥`
        : `Chào ${shortName}! Hôm nay có ${stats.urgentCount} việc GẤP đang chờ đó, bấm Điểm danh vào ca liền nhen! 🔥`;
    }
    return isGoat
      ? `Be beee~ Chào ${shortName}! Bé Dê mang cỏ 4 lá tới rồi nè, bấm Điểm danh nhận +10 🍊 nha 🍀`
      : `Chào buổi sáng ${shortName}! Nhấn vào mình để điểm danh vào ca nhận +10 Quýt vàng nào 🍊`;
  }

  if (stats.urgentCount > 0) {
    return isGoat
      ? `Be~ ${shortName} ơi đang có ${stats.urgentCount} việc GẤP nè, tụi mình xử đẹp luôn nha! 💪`
      : `${shortName} ơi, đang có ${stats.urgentCount} việc GẤP cần ưu tiên xử lý trước nè! Cố lên nha 💪`;
  }

  if (stats.pendingCount === 0) {
    return isGoat
      ? `Beee~ Sạch bóng việc rồi ${shortName} ơi! Ngồi rung chuông tận hưởng thảnh thơi thôi 🍀`
      : `Quá đỉnh ${shortName} ơi! Sạch bóng việc chờ xử lý rồi, ngồi chill uống trà cùng mình nhé 🍵`;
  }

  if (state.todayRecord.mood === 'coffee') {
    return `Làm một ngụm trà sữa cho tỉnh táo rồi dọn ${stats.pendingCount} việc đang chờ nha ${shortName}! 🧋`;
  }

  return isGoat
    ? `Lắc chuông leng keng! Còn ${stats.pendingCount} việc đang xử lý, Bé Dê chúc ${shortName} làm đâu trúng đó 🍀`
    : `Đang vào ca mượt mà! Còn ${stats.pendingCount} việc đang xử lý, từ từ gỡ từng khách hàng nhen ${shortName} ✨`;
}

export function dispatchMascotCelebrate(taskTitle?: string) {
  window.dispatchEvent(new CustomEvent(MASCOT_CELEBRATE_EVENT, { detail: { taskTitle } }));
}

export function dispatchMascotStats(stats: MascotTaskStats) {
  window.dispatchEvent(new CustomEvent(MASCOT_STATS_EVENT, { detail: stats }));
}

const EGG_PETTING_QUOTES = [
  '🥚 Ấm quá đi~ Trứng rung rinh nhẹ rồi nè, cố đi làm đúng giờ để xem bé gì nở ra nha bồ! ✨',
  '🥚 Gõ nhẹ vỏ trứng cái cốc... hình như có bé gì đang ngọ nguậy bên trong đó bồ! 👀',
  '🥚 Chúc bồ một ngày làm việc siêu mượt, ấp trứng đủ 5 ngày đúng giờ là nở liền nha! 🌟',
  '🥚 Vỏ trứng ấm áp quá nè, cảm ơn bồ đã chăm sóc mình mỗi sáng nha! 💛',
  '🥚 Bí mật bên trong là 1 trong 18 linh vật dễ thương đó, ráng giữ chuỗi 5 ngày nhé bồ! 🐾',
];

const GENERAL_PETTING_QUOTES = [
  'Hihi nhột quá bồ ơi! Xoa đầu lấy hên, làm đâu trúng đó nha 🍊',
  'Cảm ơn bồ đã nựng mình, tiếp thêm 100% năng lượng gánh sổ sách nè! 💛',
  'Mềm mịn dễ thương hết nấc chưa bồ? Cố lên nha! ✨',
  'Xoa đầu một cái là deadline tự động né ra xa luôn đó hihi 🥰',
  'Hôm nay bồ làm việc chăm chỉ lắm, mình luôn ở đây cổ vũ bồ nè! 🐾',
];

const GOAT_PETTING_QUOTES = [
  'Be beee~ Thích quá! Tặng bồ thêm may mắn từ cỏ 4 lá nè 🍀',
  'Xoa đầu Bé Dê một cái, cả ngày hồ sơ duyệt cái rụp nha bồ! ✨',
  'Leng keng~ Chuông nhỏ kêu vui tai quá, cảm ơn bồ đã nựng mình 💛',
  'Bé Dê ngoan ngoãn ngồi đây cổ vũ bồ làm việc siêu năng suất luôn! 🐐',
  'Hihi nhột quá! Chúc bồ hôm nay cân sổ sách chuẩn không cần chỉnh 🥰',
];

export function getRandomPetSpeech(
  staffName?: string,
  mascotType: MascotType = 'capybara',
  isEggUnhatched = false
): string {
  const shortName = staffName?.trim().split(/\s+/).slice(-1)[0];
  const pool = isEggUnhatched
    ? EGG_PETTING_QUOTES
    : mascotType === 'goat'
    ? GOAT_PETTING_QUOTES
    : GENERAL_PETTING_QUOTES;
  const quote = pool[Math.floor(Math.random() * pool.length)];
  return shortName ? quote.replace(/\bbồ\b/g, shortName) : quote;
}
