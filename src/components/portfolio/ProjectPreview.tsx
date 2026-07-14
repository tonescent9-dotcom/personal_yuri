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
    <section id="projects" className="relative bg-[#05060a] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* 섹션 헤더 */}
        <div className="mb-16 max-w-2xl sm:mb-24">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[#8b7dff]">
            Selected Work
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            작은 점들이 모여
            <br />
            의미 있는 경험이 됩니다.
          </h2>
        </div>

        {/* 프로젝트 리스트 (에디토리얼) */}
        <div className="flex flex-col gap-20 sm:gap-28">
          {projects.map((project, index) => (
            <article
              key={project.id}
              ref={(el) => {
                articleRefs.current[index] = el;
              }}
              className={`group flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16 ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* 넓은 이미지(placeholder) 영역 — 먼저 등장 */}
              <a
                href={project.href}
                aria-label={`${project.title} 프로젝트 보기`}
                className="scroll-up relative block w-full overflow-hidden rounded-2xl lg:w-3/5"
                style={suDelay(0)}
              >
                {/* 패럴랙스 래퍼 (약간 크게 잡아 이동 시 빈틈이 안 보이게) */}
                <div
                  ref={(el) => {
                    parallaxRefs.current[index] = el;
                  }}
                  className="-my-8 will-change-transform"
                  aria-hidden="true"
                >
                  <div
                    className="aspect-[16/10] w-full scale-100 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    style={{ background: project.gradient }}
                  />
                  {/* 은은한 하이라이트 오버레이 */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 55%)',
                    }}
                  />
                </div>
                {/* 인덱스 번호 */}
                <span className="absolute bottom-4 left-5 z-10 text-sm font-medium tracking-widest text-white/70">
                  {String(project.id).padStart(2, '0')}
                </span>
              </a>

              {/* 타이포그래피 영역 — 살짝 뒤에 등장 */}
              <div
                className="scroll-up w-full lg:w-2/5"
                style={suDelay(140)}
              >
                <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#6b7080]">
                  <span>{project.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.year}</span>
                </div>
                <h3 className="mb-4 text-2xl font-semibold text-white sm:text-3xl">
                  {project.title}
                </h3>
                <p className="mb-6 max-w-md text-base leading-relaxed text-[#9aa0ad]">
                  {project.description}
                </p>
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
