import { useMemo } from 'react';
import * as THREE from 'three';
import type { Dot } from './FloatingDots';

type DotConnectionsProps = {
  dots: Dot[];
  /** FloatingDots 에서 계산한 연결 쌍 (adjacency 와 동일한 그래프를 공유) */
  edges: [number, number][];
};

/*
  =========================================================================
  가까운 점들만 아주 흐린 선으로 연결한다.
  -------------------------------------------------------------------------
  - edges 는 FloatingDots 에서 계산되어 빛(pulse)이 이동하는 경로와 동일하다.
  - 정적인 base 위치를 사용하며 부모 group 안에서 함께 회전한다.
  - 성능 이슈가 있으면 FloatingDots 에서 showConnections={false} 로 끄면 됨.
  =========================================================================
*/
export function DotConnections({ dots, edges }: DotConnectionsProps) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (const [i, j] of edges) {
      const a = dots[i].position;
      const b = dots[j].position;
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
    );
    return geo;
  }, [dots, edges]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#6f66d6"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </lineSegments>
  );
}
