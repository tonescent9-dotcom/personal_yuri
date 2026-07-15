import { useEffect, useRef, type CSSProperties } from 'react';
import { projects } from '../../data/projects';

/** --su-delay 를 타입 안전하게 넘기기 위한 헬퍼 */
function suDelay(ms: number): CSSProperties {
  return { ['--su-delay' as string]: `${ms}ms` };
}

/**
 * 히어로 바로 아래의 프로젝트 미리보기 섹션 (#projects).
 * - 반복 카드 대신 넓은 이미지 + 타이포그래피 중심의 에디토리얼 레이아웃
 * - 스크롤로 뷰포트에 들어오면 아래에서 위로 등장(이미지 → 텍스트 순차)
 * - 이미지에는 스크롤에 반응하는 은은한 패럴랙스
 */
export function ProjectPreview() {
  const articleRefs = useRef<Array<HTMLElement | null>>([]);
  const parallaxRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 1) 스크롤 등장: 뷰포트에 들어오면 .in-view 부여
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const elements = articleRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );

    if (prefersReduced) {
      elements.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 2) 이미지 패럴랙스: 스크롤에 따라 살짝 어긋나게 움직인다 (공감각적 무빙)
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of parallaxRefs.current) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // 요소 중심이 화면 중심에서 얼마나 떨어졌는지 → 아주 약한 반대 이동
        const offset = rect.top + rect.height / 2 - vh / 2;
        el.style.transform = `translate3d(0, ${(-offset * 0.06).toFixed(2)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="projects" className="relative">
      {projects.map((project, index) => (
        <article
          key={project.id}
          ref={(el) => {
            articleRefs.current[index] = el;
          }}
          className={`snap-panel group flex min-h-svh items-center py-16 ${
            index === 0 ? 'mt-50 sm:mt-64' : 'mt-25'
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-8">
            {/* 첫 패널에만 섹션 헤더를 얹는다 */}
            {index === 0 && (
              <div className="mb-14 max-w-2xl">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[#8b7dff]">
                  Selected Work
                </p>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                  작은 점들이 모여
                  <br />
                  의미 있는 경험이 됩니다.
                </h2>
              </div>
            )}

            <div
              className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16 ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* 유리알 카드 — 매우 투명 + 테두리가 빛나는 글래스 */}
              <a
                href={project.href}
                aria-label={`${project.title} 프로젝트 보기`}
                className="scroll-up group/card relative block aspect-3/4 w-full overflow-hidden rounded-4xl border border-white/25 backdrop-blur-2xl transition-transform duration-500 ease-out will-change-transform hover:-translate-y-2 sm:mx-auto sm:max-w-sm lg:mx-0 lg:w-2/5"
                style={{
                  ...suDelay(0),
                  // 아주 옅은 유리 본체(투명감 유지)
                  background:
                    'linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.015) 100%)',
                  // 바깥: 어두운 깊이 그림자 + 프로젝트 색 후광(테두리 빛)  /  안쪽: 밝은 상단 라인
                  boxShadow: `0 30px 80px -30px rgba(0,0,0,0.85), 0 0 55px -12px ${project.tint}, inset 0 1px 1px rgba(255,255,255,0.55)`,
                }}
              >
                {/* 프로젝트 색이 유리 안으로 스며드는 빛(패럴랙스로 살짝 움직임) */}
                <div
                  ref={(el) => {
                    parallaxRefs.current[index] = el;
                  }}
                  className="pointer-events-none absolute -inset-10 will-change-transform"
                  aria-hidden="true"
                  style={{
                    background: `radial-gradient(55% 55% at 30% 25%, ${project.tint}, transparent 70%)`,
                  }}
                />

                {/* 상단 테두리를 따라 흐르는 밝은 빛(유리알 윗면 반사) */}
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    background:
                      'radial-gradient(140% 90% at 50% -30%, rgba(255,255,255,0.45), transparent 55%)',
                  }}
                />

                {/* 좌상단 하이라이트 crescent(유리알 특유의 밝은 반사) */}
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    background:
                      'radial-gradient(45% 45% at 22% 18%, rgba(255,255,255,0.35), transparent 60%)',
                  }}
                />

                {/* 대각선 광택 줄 */}
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 28%)',
                  }}
                />

                {/* 안쪽 빛나는 테두리(rim) + 아래쪽 볼륨 그림자 */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-4xl"
                  aria-hidden="true"
                  style={{
                    boxShadow:
                      'inset 0 0 0 1px rgba(255,255,255,0.28), inset 0 0 32px rgba(255,255,255,0.14), inset 0 -30px 50px -25px rgba(0,0,0,0.55)',
                  }}
                />

                {/* 호버 시 rim 이 더 밝게 빛남 */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-4xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                  aria-hidden="true"
                  style={{
                    boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.5), 0 0 40px -6px ${project.tint}`,
                  }}
                />

                {/* 인덱스 번호 */}
                <span className="absolute bottom-4 left-5 z-10 text-sm font-medium tracking-widest text-white/70">
                  {String(project.id).padStart(2, '0')}
                </span>
              </a>

              {/* 타이포그래피 영역 — 살짝 뒤에 등장 */}
              <div className="scroll-up w-full lg:w-2/5" style={suDelay(140)}>
                <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#6b7080]">
                  <span>{project.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.year}</span>
                </div>
                <h3 className="mb-6 text-2xl font-semibold text-white sm:text-3xl">
                  {project.title}
                </h3>
                <a
                  href={project.href}
                  aria-label={`${project.title} 자세히 보기`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-[#8b7dff]"
                >
                  View project
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
