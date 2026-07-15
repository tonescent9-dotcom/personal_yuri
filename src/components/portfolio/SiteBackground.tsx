import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Starfield, Nebula } from './Starfield';

/** prefers-reduced-motion 사용자 여부를 구독하는 훅 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * 페이지 전체 뒤에 고정으로 깔리는 딥스페이스 배경.
 * - position: fixed 라 스크롤해도 뷰포트에 남아, 모든 섹션에 별이 은은하게 이어진다.
 * - pointer-events-none 이라 클릭/스크롤을 방해하지 않는다(인터랙션은 히어로의 별자리 전용).
 * - 각 섹션 배경을 투명하게 두면 이 별밭이 그대로 비쳐 보인다.
 */
export function SiteBackground() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ width: '100vw', height: '100dvh' }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Nebula />
          <Starfield count={4000} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
