import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Moon,
  Pencil,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import type { UserProfile } from '../../lib/profile';
import {
  MASCOT_ACCESSORIES,
  MASCOT_CELEBRATE_EVENT,
  MASCOT_MOODS,
  MASCOT_STATS_EVENT,
  checkInMascot,
  checkOutMascot,
  getMascotSpeech,
  getMascotUserKey,
  loadMascotState,
  renameMascot,
  resolveMascotExpression,
  rewardTaskCompleted,
  unlockOrEquipAccessory,
  updateMascotMood,
  type MascotAccessoryId,
  type MascotMood,
  type MascotState,
  type MascotTaskStats,
} from '../../lib/mascot';
import { CapybaraAvatar } from './CapybaraAvatar';

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
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'wardrobe'>('attendance');
  const [selectedMood, setSelectedMood] = useState<MascotMood>(
    () => loadMascotState(userKey, profile.fullName).todayRecord?.mood || 'fire'
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [celebrateTaskTitle, setCelebrateTaskTitle] = useState<string | undefined>(undefined);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(() => loadMascotState(userKey, profile.fullName).petName);
  const [shopNotice, setShopNotice] = useState('');
  const celebrateTimer = useRef<number | null>(null);

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
    };
  }, [userKey, profile.fullName]);

  const expression = resolveMascotExpression(state, stats, isCelebrating);
  const speech = getMascotSpeech(state, stats, isCelebrating, profile.fullName, celebrateTaskTitle);
  const isCheckedIn = Boolean(state.todayRecord);
  const isCheckedOut = Boolean(state.todayRecord?.checkOutTime);

  const handleCheckIn = () => {
    const updated = checkInMascot(userKey, selectedMood, profile.fullName);
    setState(updated);
    setIsCelebrating(true);
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

  const renderPanelBody = (onCloseMobile?: () => void) => (
    <div className="flex flex-col h-full bg-[#FFFDF9] text-gray-900">
      {/* Top Bar */}
      <div className="px-3 py-2.5 border-b border-amber-200/80 bg-[#FFF7E6] flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
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
                <Check size={12} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-gray-900 text-xs truncate">{state.petName}</h3>
              <button
                type="button"
                onClick={() => {
                  setNameInput(state.petName);
                  setIsRenaming(true);
                }}
                className="text-gray-400 hover:text-amber-700 p-0.5 rounded transition shrink-0"
                title="Đổi tên linh vật"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
        </div>

        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-gray-500 hover:bg-amber-100 hover:text-gray-800 transition"
            aria-label="Đóng bảng linh vật"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDesktopExpanded(false)}
            className="p-1 rounded-lg text-gray-500 hover:bg-amber-100 hover:text-gray-800 transition"
            title="Thu gọn thanh linh vật"
            aria-label="Thu gọn thanh linh vật"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Scrollable Inner Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Big Animated Capybara Stage */}
        <div
          data-darkreader-ignore=""
          className={`relative rounded-2xl border p-3 flex flex-col items-center justify-center transition-colors ${
            isCelebrating
              ? 'bg-emerald-50 border-emerald-300'
              : stats.urgentCount > 0
              ? 'bg-rose-50/70 border-rose-200'
              : isCheckedOut
              ? 'bg-indigo-50/80 border-indigo-200'
              : 'bg-[#FEF3C7]/60 border-amber-200'
          }`}
        >
          <CapybaraAvatar
            expression={expression}
            accessory={state.equippedAccessory}
            size={132}
            withBadgeBg={true}
          />

          {/* Badges under Capybara */}
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
              🍊 {state.tangerines}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
              <Flame size={11} className="text-rose-500" /> {state.streak} ngày
            </span>
          </div>
        </div>

        {/* Speech Bubble */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-950 leading-relaxed font-medium">
          {speech}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-amber-100/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition ${
              activeTab === 'attendance'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chấm công
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wardrobe')}
            className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === 'wardrobe'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={11} /> Tủ đồ ({state.unlockedAccessories.length}/{MASCOT_ACCESSORIES.length})
          </button>
        </div>

        {activeTab === 'attendance' ? (
          <div className="space-y-2.5">
            {/* Mood Picker */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border text-left transition ${
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

            {/* Mini Task Counters */}
            <div className="grid grid-cols-3 gap-1.5 bg-gray-50 rounded-xl p-2 border border-gray-200/70 text-center">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Chờ</p>
                <p className="text-sm font-bold text-gray-800">{stats.pendingCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Gấp</p>
                <p className={`text-sm font-bold ${stats.urgentCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {stats.urgentCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Xong</p>
                <p className="text-sm font-bold text-emerald-600">{stats.completedTodayCount}</p>
              </div>
            </div>

            {/* Action Button */}
            {!isCheckedIn ? (
              <button
                type="button"
                onClick={handleCheckIn}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Sun size={15} /> Điểm danh vào ca (+10 🍊)
              </button>
            ) : !isCheckedOut ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-medium">
                  <span>✅ Vào ca {state.todayRecord?.checkInTime}</span>
                  <span>+10 🍊</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckOut}
                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Moon size={13} /> Hết ca · Sạc pin (+5 🍊)
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-2 font-medium text-center">
                  🌙 {state.todayRecord?.checkInTime} – {state.todayRecord?.checkOutTime}
                </div>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  className="w-full py-1.5 px-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-[11px] font-semibold transition"
                >
                  Mở lại ca làm việc
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {shopNotice && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 font-medium">
                {shopNotice}
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
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
                      <span className="text-base leading-none">{item.emoji}</span>
                      {equipped ? (
                        <span className="text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                          Đeo
                        </span>
                      ) : unlocked ? (
                        <span className="text-[9px] font-semibold text-emerald-700">Có</span>
                      ) : (
                        <span className="text-[9px] font-bold text-orange-700">{item.cost}🍊</span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-gray-800 leading-tight">{item.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      data-darkreader-ignore=""
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none' }}
      className="shrink-0"
    >
      {/* Desktop Right-Edge Docked Rail */}
      <aside
        className={`hidden lg:flex flex-col h-screen border-l border-amber-200/80 bg-[#FFFDF9] shadow-sm transition-all duration-200 ${
          desktopExpanded ? 'w-[240px]' : 'w-[60px]'
        }`}
      >
        {desktopExpanded ? (
          renderPanelBody()
        ) : (
          <div className="flex flex-col items-center py-3 gap-3 h-full bg-[#FFFDF9]">
            <button
              type="button"
              onClick={() => setDesktopExpanded(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-100 hover:text-amber-900 transition"
              title="Mở rộng bảng Capybara"
              aria-label="Mở rộng bảng Capybara"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setDesktopExpanded(true)}
              className="relative group hover:scale-105 transition"
              title={`${state.petName} · Nhấn để mở`}
            >
              <CapybaraAvatar
                expression={expression}
                accessory={state.equippedAccessory}
                size={46}
                withBadgeBg={true}
              />
              {!isCheckedIn && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-full animate-pulse" />
              )}
              {isCheckedIn && stats.urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {stats.urgentCount}
                </span>
              )}
            </button>

            <div className="flex flex-col items-center gap-1.5 mt-1 text-[10px] font-bold">
              <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                🍊{state.tangerines}
              </span>
              <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full">
                🔥{state.streak}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile / Tablet Floating Right-Edge Trigger + Slide-over Drawer */}
      <div className="lg:hidden">
        {!mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-40 rounded-full shadow-lg hover:scale-105 transition"
            title={`${state.petName} · Nhấn để mở chấm công`}
          >
            <CapybaraAvatar
              expression={expression}
              accessory={state.equippedAccessory}
              size={64}
              withBadgeBg={true}
            />
            {!isCheckedIn && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </button>
        )}

        {mobileOpen && (
          <>
            <button
              type="button"
              aria-label="Đóng bảng linh vật"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/35"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-[260px] shadow-2xl border-l border-amber-200">
              {renderPanelBody(() => setMobileOpen(false))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
