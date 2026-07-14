import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FloatingDots } from './FloatingDots';

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
 * 히어로 화면의 배경 레이어.
 * Three.js Canvas 는 순수 장식이므로 aria-hidden 으로 스크린리더 흐름에서 제외한다.
 */
export function ThreeBackground() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className="fade is-visible absolute inset-0 z-0"
      style={{ ['--reveal-delay' as string]: '0ms' }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[4, 4, 6]} intensity={2} />
        <Suspense fallback={null}>
          <FloatingDots reducedMotion={reducedMotion} showConnections />
        </Suspense>
      </Canvas>
    </div>
  );
}
