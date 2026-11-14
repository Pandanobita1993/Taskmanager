import React, { useEffect, useRef, useState } from 'react';
import { Check, Flame, Moon, Pencil, Sparkles, Sun, X } from 'lucide-react';
import type { UserProfile } from '../../lib/profile';
import {
  MASCOT_ACCESSORIES,
  MASCOT_CELEBRATE_EVENT,
  MASCOT_MOODS,
  MASCOT_SPECIES,
  MASCOT_STATS_EVENT,
  ON_TIME_CHECKIN_CUTOFF,
  changeMascotType,
  changeMascotVariant,
  checkInMascot,
  checkOutMascot,
  getMascotSpeech,
  getMascotUserKey,
  getRandomPetSpeech,
  loadMascotState,
  renameMascot,
  resetEggIncubation,
  resolveMascotExpression,
  rewardTaskCompleted,
  unlockOrEquipAccessory,
  updateMascotMood,
  type MascotAccessoryId,
  type MascotMood,
  type MascotState,
  type MascotTaskStats,
  type MascotType,
  type MascotVariant,
} from '../../lib/mascot';
import { MascotAvatar } from './MascotAvatar';

interface MascotCompanionProps {
  profile: UserProfile;
}

const DEFAULT_STATS: MascotTaskStats = {
  pendingCount: 0,
  urgentCount: 0,
  completedTodayCount: 0,
};

export const MascotCompanion: React.FC<MascotCompanionProps> = ({ profile }) => {
  if (!profile.isSetupComplete) return null;
  const userKey = getMascotUserKey({ id: profile.id, fullName: profile.fullName });
  return <MascotCompanionInner key={userKey} profile={profile} userKey={userKey} />;
};

const MascotCompanionInner: React.FC<{ profile: UserProfile; userKey: string }> = ({
  profile,
  userKey,
}) => {
  const [state, setState] = useState<MascotState>(() => loadMascotState(userKey, profile.fullName));
  const [stats, setStats] = useState<MascotTaskStats>(DEFAULT_STATS);
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'wardrobe'>('attendance');
  const [selectedMood, setSelectedMood] = useState<MascotMood>(
    () => loadMascotState(userKey, profile.fullName).todayRecord?.mood || 'fire'
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isPetting, setIsPetting] = useState(false);
  const [petSpeech, setPetSpeech] = useState('');
  const [celebrateTaskTitle, setCelebrateTaskTitle] = useState<string | undefined>(undefined);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(() => loadMascotState(userKey, profile.fullName).petName);
  const [shopNotice, setShopNotice] = useState('');
  const celebrateTimer = useRef<number | null>(null);
  const petTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleStats = (e: Event) => {
      const detail = (e as CustomEvent<MascotTaskStats>).detail;
      if (detail) setStats(detail);
    };

    const handleCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<{ taskTitle?: string }>).detail;
      const updated = rewardTaskCompleted(userKey, profile.fullName);
      setState(updated);
      setCelebrateTaskTitle(detail?.taskTitle);
      setIsCelebrating(true);
      setShowBubble(true);

      if (celebrateTimer.current) {
        window.clearTimeout(celebrateTimer.current);
      }
      celebrateTimer.current = window.setTimeout(() => {
        setIsCelebrating(false);
        setCelebrateTaskTitle(undefined);
      }, 4500);
    };

    window.addEventListener(MASCOT_STATS_EVENT, handleStats);
    window.addEventListener(MASCOT_CELEBRATE_EVENT, handleCelebrate);
    return () => {
      window.removeEventListener(MASCOT_STATS_EVENT, handleStats);
      window.removeEventListener(MASCOT_CELEBRATE_EVENT, handleCelebrate);
      if (celebrateTimer.current) {
        window.clearTimeout(celebrateTimer.current);
      }
      if (petTimer.current) {
        window.clearTimeout(petTimer.current);
      }
    };
  }, [userKey, profile.fullName]);

  const expression = resolveMascotExpression(state, stats, isCelebrating);
  const speech = isPetting && petSpeech
    ? petSpeech
    : getMascotSpeech(state, stats, isCelebrating, profile.fullName, celebrateTaskTitle);
  const isCheckedIn = Boolean(state.todayRecord);
  const isCheckedOut = Boolean(state.todayRecord?.checkOutTime);

  const handlePet = () => {
    setIsPetting(true);
    setPetSpeech(getRandomPetSpeech(profile.fullName, state.mascotType, isEggUnhatched));
    setShowBubble(true);
    if (petTimer.current) window.clearTimeout(petTimer.current);
    petTimer.current = window.setTimeout(() => {
      setIsPetting(false);
      setPetSpeech('');
    }, 2800);
  };

  const handleSelectSpecies = (mascotType: MascotType) => {
    const updated = changeMascotType(userKey, mascotType, profile.fullName);
    setState(updated);
    setNameInput(updated.petName);
  };

  const handleCheckIn = () => {
    const updated = checkInMascot(userKey, selectedMood, profile.fullName);
    setState(updated);
    setIsCelebrating(true);
    setShowBubble(true);
    if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
    celebrateTimer.current = window.setTimeout(() => setIsCelebrating(false), 2600);
  };

  const handleCheckOut = () => {
    const updated = checkOutMascot(userKey, profile.fullName);
    setState(updated);
  };

  const handleChangeMood = (mood: MascotMood) => {
    setSelectedMood(mood);
    if (isCheckedIn) {
      setState(updateMascotMood(userKey, mood, profile.fullName));
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = renameMascot(userKey, nameInput, profile.fullName);
    setState(updated);
    setIsRenaming(false);
  };

  const handleSelectVariant = (variant: MascotVariant) => {
    const updated = changeMascotVariant(userKey, variant, profile.fullName);
    setState(updated);
  };

  const handleResetEgg = () => {
    const updated = resetEggIncubation(userKey, profile.fullName);
    setState(updated);
    setNameInput(updated.petName);
    setShowBubble(true);
  };

  const isEggUnhatched = Boolean(state.eggIncubation && !state.eggIncubation.hatched);

  const handleAccessoryClick = (id: MascotAccessoryId) => {
    const res = unlockOrEquipAccessory(userKey, id, profile.fullName);
    setState(res.state);
    if (!res.ok && res.reason) {
      setShopNotice(res.reason);
      window.setTimeout(() => setShopNotice(''), 3000);
    } else {
      setShopNotice('');
    }
  };

  return (
    <div
      ref={containerRef}
      data-darkreader-ignore=""
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none' }}
      className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 flex items-center gap-3 pointer-events-none"
    >
      {/* Expanded Attendance & Wardrobe Popover (opens to the left of the Capybara) */}
      {isOpen && (
        <div
          data-darkreader-ignore=""
          className="pointer-events-auto w-[320px] max-w-[calc(100vw-6.5rem)] bg-[#FFFFFF] text-gray-900 rounded-2xl shadow-2xl border border-amber-200 overflow-hidden"
          style={{ colorScheme: 'only light', forcedColorAdjust: 'none' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/80 px-4 py-3 border-b border-amber-200/70 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={28}
                    autoFocus
                    className="w-full text-xs font-bold text-gray-800 bg-white border border-amber-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    className="p-1 bg-amber-500 text-white rounded hover:bg-amber-600 shrink-0"
                    title="Lưu tên"
                  >
                    <Check size={13} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{state.petName}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(state.petName);
                      setIsRenaming(true);
                    }}
                    className="text-gray-400 hover:text-amber-700 p-0.5 rounded transition"
                    title="Đổi tên linh vật"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                  🍊 {state.tangerines} Quýt
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                  <Flame size={11} className="text-rose-500" /> {state.streak} ngày
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="self-start text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-white/70 transition"
              aria-label="Đóng bảng linh vật"
            >
              <X size={16} />
            </button>
          </div>

          {/* Speech */}
          <div className="px-4 pt-3 pb-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-950 leading-relaxed font-medium">
              {speech}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 flex gap-2 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`py-2 px-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'attendance'
                  ? 'border-amber-500 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Chấm công hôm nay
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wardrobe')}
              className={`py-2 px-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1 ${
                activeTab === 'wardrobe'
                  ? 'border-amber-500 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Sparkles size={12} /> Tủ đồ ({state.unlockedAccessories.length}/{MASCOT_ACCESSORIES.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'attendance' ? (
              <div className="space-y-3">
                {isEggUnhatched && state.eggIncubation && (
                  <div className="rounded-xl bg-amber-50/90 border border-amber-200 px-3 py-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5">
                      <span>🥚 Ấp trứng linh vật ngẫu nhiên</span>
                      <span>
                        {state.eggIncubation.streakDays}/{state.eggIncubation.targetDays} ngày
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                      {Array.from({ length: state.eggIncubation.targetDays }).map((_, i) => {
                        const filled = i < (state.eggIncubation?.streakDays ?? 0);
                        return (
                          <div
                            key={i}
                            className={`h-2 rounded-full transition-colors ${
                              filled ? 'bg-amber-500' : 'bg-amber-200/70'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Điểm danh đúng/sớm giờ (≤ {ON_TIME_CHECKIN_CUTOFF}) liên tục {state.eggIncubation.targetDays} ngày để nở ra linh vật bí ẩn (+20 🍊)!
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Tâm trạng hôm nay
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MASCOT_MOODS.map((m) => {
                      const active = (isCheckedIn ? state.todayRecord?.mood : selectedMood) === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleChangeMood(m.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition ${
                            active
                              ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span className="truncate">{m.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Đang chờ</p>
                    <p className="text-sm font-bold text-gray-800">{stats.pendingCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Việc gấp</p>
                    <p className={`text-sm font-bold ${stats.urgentCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {stats.urgentCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Xong</p>
                    <p className="text-sm font-bold text-emerald-600">{stats.completedTodayCount}</p>
                  </div>
                </div>

                {!isCheckedIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Sun size={16} /> Điểm danh vào ca (+10 🍊)
                  </button>
                ) : !isCheckedOut ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 font-medium">
                      <span>✅ Đã vào ca lúc {state.todayRecord?.checkInTime}</span>
                      <span>+10 🍊</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckOut}
                      className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Moon size={14} /> Hết ca · Sạc pin (+5 🍊)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 font-medium text-center">
                      🌙 Vào ca {state.todayRecord?.checkInTime} · Hết ca {state.todayRecord?.checkOutTime}
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckIn}
                      className="w-full py-1.5 px-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold transition"
                    >
                      Mở lại ca làm việc
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Chọn linh vật riêng */}
                {isEggUnhatched && state.eggIncubation ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                    <p className="text-xs font-bold text-amber-900 mb-1">
                      🥚 Trứng bí ẩn đang ấp ({state.eggIncubation.streakDays}/{state.eggIncubation.targetDays} ngày)
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Mỗi tài khoản được tặng 1 quả trứng ngẫu nhiên trong 18 linh vật. Điểm danh đúng/sớm giờ (≤ {ON_TIME_CHECKIN_CUTOFF}) 5 ngày liên tiếp để mở khóa tủ linh vật nha!
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Chọn linh vật ({MASCOT_SPECIES.length} bé)
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleResetEgg}
                          title="Nhận quả trứng ngẫu nhiên mới để ấp lại 5 ngày"
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                        >
                          🥚 Ấp trứng
                        </button>
                        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleSelectVariant('default')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                              (state.mascotVariant || 'default') === 'default'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            ✨ Mặc định
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectVariant('feminine')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                              state.mascotVariant === 'feminine'
                                ? 'bg-pink-500 text-white shadow-sm'
                                : 'text-gray-500 hover:text-pink-600'
                            }`}
                          >
                            🌸 Nữ tính
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pr-0.5">
                      {MASCOT_SPECIES.map((sp) => {
                        const active = state.mascotType === sp.id;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => handleSelectSpecies(sp.id)}
                            title={sp.tagline}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left transition ${
                              active
                                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-400 text-emerald-950'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                            }`}
                          >
                            <span className="text-base leading-none">{sp.emoji}</span>
                            <span className="text-[11px] font-bold truncate">{sp.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {shopNotice && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                    {shopNotice}
                  </p>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Phụ kiện ({state.unlockedAccessories.length}/{MASCOT_ACCESSORIES.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-[170px] overflow-y-auto pr-0.5">
                  {MASCOT_ACCESSORIES.map((item) => {
                    const unlocked = state.unlockedAccessories.includes(item.id);
                    const equipped = state.equippedAccessory === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAccessoryClick(item.id)}
                        title={item.description}
                        className={`p-2 rounded-xl border text-left transition flex flex-col gap-1 ${
                          equipped
                            ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-400'
                            : unlocked
                            ? 'bg-white border-gray-200 hover:border-amber-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg leading-none">{item.emoji}</span>
                          {equipped ? (
                            <span className="text-[10px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                              Đang đeo
                            </span>
                          ) : unlocked ? (
                            <span className="text-[10px] font-semibold text-emerald-700">Đã có</span>
                          ) : (
                            <span className="text-[10px] font-bold text-orange-700">
                              {item.cost} 🍊
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{item.name}</p>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Big Capybara Living Directly on the Right-Side Background */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        {!isOpen && showBubble && (
          <div
            data-darkreader-ignore=""
            style={{ colorScheme: 'only light', forcedColorAdjust: 'none' }}
            className="relative flex items-start gap-2 w-[210px] sm:w-[245px] bg-[#FFFDF8] border border-amber-300 shadow-lg rounded-2xl px-3 py-2 text-xs text-amber-950 font-medium leading-relaxed"
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-left flex-1 whitespace-normal break-words hover:text-amber-800 transition"
            >
              {speech}
            </button>
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5 p-0.5 rounded"
              aria-label="Ẩn lời chào"
            >
              <X size={12} />
            </button>
            {/* Speech bubble tail pointing down to Capybara */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-12 w-3 h-3 bg-[#FFFDF8] border-r border-b border-amber-300 rotate-45"
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">

        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setShowBubble(true);
          }}
          className="relative group bg-transparent p-0 border-0 focus:outline-none hover:scale-105 transition-transform drop-shadow-md"
          title={`${state.petName} · Nhấn để mở chấm công`}
        >
          <div className="hidden md:block">
            <MascotAvatar
              mascotType={state.mascotType}
              expression={expression}
              accessory={state.equippedAccessory}
              variant={state.mascotVariant || 'default'}
              eggIncubation={state.eggIncubation}
              size={118}
              withBadgeBg={false}
              isPetting={isPetting}
            />
          </div>
          <div className="md:hidden">
            <MascotAvatar
              mascotType={state.mascotType}
              expression={expression}
              accessory={state.equippedAccessory}
              variant={state.mascotVariant || 'default'}
              eggIncubation={state.eggIncubation}
              size={72}
              withBadgeBg={false}
              isPetting={isPetting}
            />
          </div>

          {!isCheckedIn && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full shadow animate-pulse" />
          )}
          {isCheckedIn && stats.urgentCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {stats.urgentCount}
            </span>
          )}
        </button>

        {/* Compact Status & Petting Row directly under the Capybara */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="bg-[#FFFBEB] hover:bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap transition flex items-center gap-1.5"
          >
            {!isCheckedIn ? (
              <span>☀️ Điểm danh</span>
            ) : (
              <>
                <span>🍊 {state.tangerines}</span>
                <span>·</span>
                <span>🔥 {state.streak}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePet}
            className="bg-[#FFFBEB] hover:bg-rose-50 border border-amber-300 hover:border-rose-300 text-xs px-1.5 py-0.5 rounded-full shadow-sm transition hover:scale-110"
            title="Xoa đầu bé Capybara"
            aria-label="Xoa đầu bé Capybara"
          >
            🧡
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
