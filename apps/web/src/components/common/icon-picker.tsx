'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

// ─── Emoji icon set grouped by category ───────────────────────
export const EMOJI_CATEGORIES: { label: string; icons: { emoji: string; name: string }[] }[] = [
  {
    label: 'Bất động sản',
    icons: [
      { emoji: '🏢', name: 'Tòa nhà VP' },
      { emoji: '🏗️', name: 'Công trình' },
      { emoji: '🏘️', name: 'Khu nhà' },
      { emoji: '🏠', name: 'Nhà ở' },
      { emoji: '🏡', name: 'Biệt thự' },
      { emoji: '🏬', name: 'Trung tâm TM' },
      { emoji: '🏨', name: 'Khách sạn' },
      { emoji: '🏦', name: 'Ngân hàng' },
      { emoji: '🏫', name: 'Trường học' },
      { emoji: '🏥', name: 'Bệnh viện' },
      { emoji: '🏛️', name: 'Công trình lịch sử' },
      { emoji: '⛪', name: 'Nhà thờ' },
      { emoji: '🏰', name: 'Lâu đài' },
      { emoji: '🗼', name: 'Tháp' },
      { emoji: '🛗', name: 'Thang máy' },
      { emoji: '🪟', name: 'Cửa sổ' },
    ],
  },
  {
    label: 'Diện tích & Quy hoạch',
    icons: [
      { emoji: '📐', name: 'Diện tích' },
      { emoji: '📏', name: 'Kích thước' },
      { emoji: '🗺️', name: 'Bản đồ' },
      { emoji: '🧭', name: 'La bàn' },
      { emoji: '📍', name: 'Vị trí' },
      { emoji: '🌐', name: 'Khu vực' },
      { emoji: '🏔️', name: 'Địa hình' },
      { emoji: '🌆', name: 'Đô thị' },
      { emoji: '🌇', name: 'Thành phố' },
      { emoji: '🏙️', name: 'Skyline' },
      { emoji: '🌉', name: 'Cầu đường' },
      { emoji: '🧱', name: 'Tường' },
      { emoji: '🚪', name: 'Cửa' },
      { emoji: '🪞', name: 'Nội thất' },
      { emoji: '🛋️', name: 'Phòng khách' },
      { emoji: '🛏️', name: 'Phòng ngủ' },
    ],
  },
  {
    label: 'Tài chính & Giá trị',
    icons: [
      { emoji: '💰', name: 'Giá trị' },
      { emoji: '💵', name: 'Tiền mặt' },
      { emoji: '💎', name: 'Cao cấp' },
      { emoji: '💹', name: 'Tăng trưởng' },
      { emoji: '📈', name: 'Xu hướng tăng' },
      { emoji: '📊', name: 'Thống kê' },
      { emoji: '🏆', name: 'Đẳng cấp' },
      { emoji: '🥇', name: 'Hạng nhất' },
      { emoji: '⭐', name: 'Nổi bật' },
      { emoji: '✨', name: 'Đặc biệt' },
      { emoji: '🎯', name: 'Mục tiêu' },
      { emoji: '🔑', name: 'Bàn giao' },
      { emoji: '📑', name: 'Pháp lý' },
      { emoji: '📋', name: 'Hồ sơ' },
      { emoji: '🤝', name: 'Hợp tác' },
      { emoji: '🏅', name: 'Giải thưởng' },
    ],
  },
  {
    label: 'Thiên nhiên & Môi trường',
    icons: [
      { emoji: '🌳', name: 'Cây xanh' },
      { emoji: '🌲', name: 'Rừng thông' },
      { emoji: '🌴', name: 'Cây nhiệt đới' },
      { emoji: '🌿', name: 'Thảm xanh' },
      { emoji: '🍃', name: 'Lá xanh' },
      { emoji: '🌺', name: 'Hoa viên' },
      { emoji: '🌸', name: 'Vườn hoa' },
      { emoji: '☀️', name: 'Khí hậu' },
      { emoji: '🌊', name: 'Ven biển' },
      { emoji: '💧', name: 'Nguồn nước' },
      { emoji: '🏖️', name: 'Bãi biển' },
      { emoji: '🏝️', name: 'Đảo' },
      { emoji: '🌾', name: 'Đồng ruộng' },
      { emoji: '🌻', name: 'Hướng dương' },
      { emoji: '🍀', name: 'Thảo nguyên' },
      { emoji: '🌈', name: 'Cảnh quan' },
    ],
  },
  {
    label: 'Tiện ích & Dịch vụ',
    icons: [
      { emoji: '🏊', name: 'Hồ bơi' },
      { emoji: '🏋️', name: 'Phòng gym' },
      { emoji: '🧘', name: 'Spa' },
      { emoji: '⛳', name: 'Sân golf' },
      { emoji: '🎾', name: 'Sân tennis' },
      { emoji: '⚽', name: 'Sân bóng' },
      { emoji: '🎡', name: 'Khu vui chơi' },
      { emoji: '🎬', name: 'Rạp chiếu phim' },
      { emoji: '🍽️', name: 'Nhà hàng' },
      { emoji: '☕', name: 'Cafe' },
      { emoji: '🛍️', name: 'Mua sắm' },
      { emoji: '🏪', name: 'Siêu thị' },
      { emoji: '🚿', name: 'Phòng tắm' },
      { emoji: '🛁', name: 'Bồn tắm' },
      { emoji: '🧹', name: 'Vệ sinh' },
      { emoji: '🔒', name: 'An ninh' },
    ],
  },
  {
    label: 'Giao thông & Hạ tầng',
    icons: [
      { emoji: '🚗', name: 'Đường xe' },
      { emoji: '🚌', name: 'Xe buýt' },
      { emoji: '🚇', name: 'Metro' },
      { emoji: '🚂', name: 'Đường sắt' },
      { emoji: '✈️', name: 'Sân bay' },
      { emoji: '🚢', name: 'Cảng biển' },
      { emoji: '🛣️', name: 'Cao tốc' },
      { emoji: '🌉', name: 'Cầu' },
      { emoji: '🅿️', name: 'Bãi đậu xe' },
      { emoji: '⚡', name: 'Điện' },
      { emoji: '💡', name: 'Chiếu sáng' },
      { emoji: '📡', name: 'Viễn thông' },
      { emoji: '🔌', name: 'Hạ tầng điện' },
      { emoji: '🚒', name: 'Phòng cháy' },
      { emoji: '🏥', name: 'Y tế' },
      { emoji: '🚦', name: 'Giao lộ' },
    ],
  },
  {
    label: 'Xây dựng & Kỹ thuật',
    icons: [
      { emoji: '👷', name: 'Công nhân' },
      { emoji: '🪚', name: 'Dụng cụ' },
      { emoji: '🔨', name: 'Búa' },
      { emoji: '🔧', name: 'Cờ lê' },
      { emoji: '⚙️', name: 'Cơ khí' },
      { emoji: '🪜', name: 'Giàn giáo' },
      { emoji: '🧲', name: 'Lực hút' },
      { emoji: '🔩', name: 'Bu lông' },
      { emoji: '🪝', name: 'Cẩu' },
      { emoji: '📦', name: 'Vật liệu' },
      { emoji: '🏗️', name: 'Thi công' },
      { emoji: '🧱', name: 'Gạch' },
      { emoji: '🛠️', name: 'Bảo trì' },
      { emoji: '🗜️', name: 'Kết cấu' },
      { emoji: '📌', name: 'Đánh dấu' },
      { emoji: '📎', name: 'Liên kết' },
    ],
  },
  {
    label: 'Con người & Cộng đồng',
    icons: [
      { emoji: '👨‍👩‍👧‍👦', name: 'Gia đình' },
      { emoji: '👥', name: 'Cộng đồng' },
      { emoji: '🧑‍💼', name: 'Doanh nhân' },
      { emoji: '🎓', name: 'Học vấn' },
      { emoji: '👶', name: 'Trẻ em' },
      { emoji: '🏃', name: 'Năng động' },
      { emoji: '🤝', name: 'Hợp tác' },
      { emoji: '🎊', name: 'Lễ khánh thành' },
      { emoji: '🎉', name: 'Sự kiện' },
      { emoji: '🔐', name: 'An ninh' },
      { emoji: '🛡️', name: 'Bảo vệ' },
      { emoji: '❤️', name: 'Yêu thích' },
      { emoji: '🫂', name: 'Gắn kết' },
      { emoji: '🌟', name: 'Xuất sắc' },
      { emoji: '🎁', name: 'Quà tặng' },
      { emoji: '🏠', name: 'An cư' },
    ],
  },
];

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.icons);

interface IconPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
}

export function IconPicker({ value, onChange, className, buttonClassName }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return null;
    return ALL_EMOJIS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const openDropdown = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 288;
    const viewportPadding = 8;
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );
    const top = rect.bottom + 6;
    setDropdownPos({ top, left, width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !dropdownRef.current || !buttonRef.current || !dropdownPos) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;

    const fitsBelow =
      rect.bottom + gap + dropdownRect.height <= window.innerHeight - viewportPadding;
    const preferredTop = fitsBelow ? rect.bottom + gap : rect.top - dropdownRect.height - gap;

    const clampedTop = Math.min(
      Math.max(preferredTop, viewportPadding),
      window.innerHeight - dropdownRect.height - viewportPadding,
    );

    const width = dropdownRect.width;
    const clampedLeft = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );

    if (
      Math.abs(dropdownPos.top - clampedTop) > 1 ||
      Math.abs(dropdownPos.left - clampedLeft) > 1
    ) {
      setDropdownPos({ top: clampedTop, left: clampedLeft, width });
    }
  }, [open, dropdownPos]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayIcons = filtered ?? EMOJI_CATEGORIES[activeCategory]?.icons ?? [];

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              width: dropdownPos.width,
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col"
          >
            {/* Search */}
            <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm biểu tượng..."
                className="flex-1 text-xs outline-none bg-transparent"
              />
              {(search || value) && (
                <button
                  type="button"
                  onClick={() => {
                    if (search) {
                      setSearch('');
                    } else {
                      onChange('');
                      setOpen(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Xóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            {!search && (
              <div className="flex gap-0.5 px-2 pt-1.5 pb-1 overflow-x-auto border-b border-gray-100">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveCategory(i)}
                    className={`flex-shrink-0 px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === i
                        ? 'bg-amber-500 text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji grid */}
            <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
              {displayIcons.map(({ emoji, name }) => (
                <button
                  key={emoji}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(emoji);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg transition-colors hover:bg-amber-50 ${
                    value === emoji ? 'bg-amber-100 ring-1 ring-amber-400' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {displayIcons.length === 0 && (
                <p className="col-span-8 text-center text-xs text-gray-400 py-3">Không tìm thấy</p>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={openDropdown}
        className={`flex h-7 w-full items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 text-xs leading-none hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 ${buttonClassName ?? ''}`}
        aria-label="Chọn biểu tượng"
      >
        {value ? (
          <span className="text-sm leading-none">{value}</span>
        ) : (
          <span className="text-xs text-gray-400">Chọn</span>
        )}
      </button>
      {dropdown}
    </div>
  );
}
