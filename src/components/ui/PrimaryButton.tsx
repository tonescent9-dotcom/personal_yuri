import type { ReactNode } from 'react';

type PrimaryButtonProps = {
  children: ReactNode;
  /** 클릭 시 스크롤할 대상 id (예: 'projects'). href 와 함께 쓰면 href 우선. */
  targetId?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

/**
 * 재사용 가능한 기본 버튼.
 * targetId 가 주어지면 해당 섹션으로 부드럽게 스크롤한다.
 * (index.css 의 scroll-behavior: smooth 및 prefers-reduced-motion 대응과 연동)
 */
export function PrimaryButton({
  children,
  targetId,
  href,
  onClick,
  ariaLabel,
}: PrimaryButtonProps) {
  const handleClick = () => {
    if (onClick) onClick();
    if (targetId) {
      const el = document.getElementById(targetId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const className =
    'pointer-events-auto inline-flex items-center gap-2 rounded-full ' +
    'bg-white px-7 py-3.5 text-sm font-medium tracking-wide text-[#05060a] ' +
    'transition duration-300 hover:bg-[#e9e6ff] hover:shadow-[0_0_30px_-8px_rgba(139,125,255,0.7)] ' +
    'active:scale-[0.98]';

  // 앵커로 스크롤: 실제 링크(href="#projects")도 접근성상 유효
  if (href) {
    return (
      <a href={href} className={className} aria-label={ariaLabel} onClick={handleClick}>
        {children}
        <span aria-hidden="true">→</span>
      </a>
    );
  }

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={handleClick}>
      {children}
      <span aria-hidden="true">→</span>
    </button>
  );
}
