import { useState } from 'react';

/*
  네비게이션 메뉴 항목.
  라벨/링크를 바꾸려면 이 배열만 수정하세요.
*/
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Playground', href: '#playground' },
  { label: 'Contact', href: '#contact' },
];

/**
 * 상단 고정 헤더.
 * - 왼쪽: 로고(DOTS)
 * - 오른쪽: 데스크톱 가로 메뉴 / 모바일 햄버거 토글
 */
export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="flex w-full items-center justify-between px-5 py-6">
        {/* 로고 */}
        <a
          href="#top"
          aria-label="DOTS 홈으로 이동"
          className="pointer-events-auto text-xl font-semibold tracking-[0.2em] text-white"
        >
          DOTS
          <span className="text-[#8b7dff]">.</span>
        </a>

        {/* 데스크톱 내비게이션 */}
        <nav aria-label="주요 메뉴" className="pointer-events-auto hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-label={`${item.label} 섹션으로 이동`}
                  className="text-base text-[#c7cbd4] transition-colors duration-200 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* 모바일 햄버거 버튼 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          className="pointer-events-auto flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-px w-6 bg-white transition-transform duration-300 ${
              open ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-px w-6 bg-white transition-opacity duration-300 ${
              open ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`h-px w-6 bg-white transition-transform duration-300 ${
              open ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      <nav
        id="mobile-menu"
        aria-label="모바일 메뉴"
        className={`pointer-events-auto overflow-hidden border-t border-white/5 bg-[#05060a]/90 backdrop-blur-md transition-[max-height] duration-300 md:hidden ${
          open ? 'max-h-72' : 'max-h-0'
        }`}
      >
        <ul className="flex flex-col px-6 py-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                aria-label={`${item.label} 섹션으로 이동`}
                className="block border-b border-white/5 py-4 text-base text-[#c7cbd4] transition-colors hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
