import { lazy, Suspense } from 'react';
import { Header } from './components/portfolio/Header';
import { HeroSection } from './components/portfolio/HeroSection';
import { ProjectPreview } from './components/portfolio/ProjectPreview';

// 전역 딥스페이스 배경(three.js)은 지연 로드
const SiteBackground = lazy(() =>
  import('./components/portfolio/SiteBackground').then((m) => ({
    default: m.SiteBackground,
  })),
);

function App() {
  return (
    <>
      {/* 페이지 전체에 깔리는 별밭 배경 (모든 섹션 뒤에 고정) */}
      <Suspense fallback={null}>
        <SiteBackground />
      </Suspense>

      {/* 키보드 사용자를 위한 본문 바로가기 링크 */}
      <a
        href="#projects"
        className="sr-only rounded-md bg-white px-4 py-2 text-sm text-[#05060a] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        본문으로 건너뛰기
      </a>

      <Header />

      <main>
        <HeroSection />
        <ProjectPreview />
      </main>

      <footer className="snap-panel relative mt-25 border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-base text-[#6b7080] sm:flex-row sm:px-8">
          <span className="tracking-[0.2em]">DOTS.</span>
          <span>작은 점들이 모여 의미 있는 경험이 됩니다.</span>
          <span>© 2026</span>
        </div>
      </footer>
    </>
  );
}

export default App;
