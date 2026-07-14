import { Suspense, lazy, useEffect, useState, type CSSProperties } from 'react';
import { PrimaryButton } from '../ui/PrimaryButton';

// 3D 배경(three.js)은 지연 로드하여 텍스트가 먼저 렌더링되게 한다.
const ThreeBackground = lazy(() =>
  import('./ThreeBackground').then((m) => ({ default: m.ThreeBackground })),
);

/** --reveal-delay 를 타입 안전하게 넘기기 위한 헬퍼 */
function delay(ms: number): CSSProperties {
  return { ['--reveal-delay' as string]: `${ms}ms` };
}

/**
 * 풀스크린 히어로 섹션.
 * - 뒤 레이어: Three.js 점 배경
 * - 앞 레이어: 소개 텍스트 + 버튼 (순차 등장)
 */
export function HeroSection() {
  // 마운트 후 등장 애니메이션 트리거
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const revealClass = (base = 'reveal') => `${base} ${ready ? 'is-visible' : ''}`;

  return (
    <section
      id="top"
      className="relative flex min-h-svh w-full items-center overflow-hidden bg-[#05060a]"
    >
      {/* 배경 3D 레이어 (지연 로드) */}
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>

      {/* 가독성을 위한 부드러운 비네트/그라디언트 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0 z-1"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(5,6,10,0.25) 0%, rgba(5,6,10,0.6) 70%, rgba(5,6,10,0.9) 100%)',
        }}
      />

      {/* 앞쪽 콘텐츠 (오버레이 자체는 pointer-events-none, 버튼만 auto) */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-8">
        <div className="max-w-2xl">
          {/* 1. 작은 영문 라벨 */}
          <p
            className={`${revealClass()} mb-6 text-xs font-medium uppercase tracking-[0.25em] text-[#8b7dff]`}
            style={delay(200)}
          >
            UX/UI Designer · Product Thinker
          </p>

          {/* 2. 메인 제목 */}
          <h1
            className={`${revealClass()} text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl`}
            style={delay(400)}
          >
            Small dots,
            <br />
            <span className="text-[#c7cbd4]">meaningful experiences.</span>
          </h1>

          {/* 3. 보조 문구 */}
          <p
            className={`${revealClass()} mt-7 max-w-md text-base leading-relaxed text-[#9aa0ad] sm:text-lg`}
            style={delay(650)}
          >
            사람의 경험을 관찰하고,
            <br />
            작은 문제를 더 나은 흐름으로 연결합니다.
          </p>

          {/* 4. 버튼 */}
          <div className={`${revealClass()} mt-10`} style={delay(900)}>
            <PrimaryButton href="#projects" targetId="projects" ariaLabel="프로젝트 섹션 보기">
              Explore my work
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* 스크롤 힌트 */}
      <div
        className={`${revealClass('fade')} pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2`}
        style={delay(1300)}
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#5b6070]">
          Scroll
        </span>
      </div>
    </section>
  );
}
