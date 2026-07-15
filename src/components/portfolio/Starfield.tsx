import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type StarfieldProps = {
  /** 별 개수 (딥필드 느낌을 위해 촘촘하게, 1000~2500 권장) */
  count?: number;
  /** 접근성: 모션 최소화 사용자 여부 */
  reducedMotion?: boolean;
};

/*
  결정론적 의사난수 — 매 렌더링마다 별 배치가 바뀌지 않도록 seed 기반.
  (FloatingDots 와 동일한 방식)
*/
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * 별의 색 팔레트 — 실제 딥필드 사진처럼 대부분 흰/아이보리,
 * 일부는 차가운 파랑, 소수는 따뜻한 주황/붉은 톤(먼 은하).
 */
const STAR_PALETTE: Array<[number, number, number]> = [
  [1.0, 0.98, 0.94], // 아이보리 화이트 (다수)
  [1.0, 0.98, 0.94],
  [1.0, 0.98, 0.94],
  [0.72, 0.82, 1.0], // 차가운 파랑
  [0.82, 0.9, 1.0],
  [1.0, 0.86, 0.7], // 따뜻한 주황
  [1.0, 0.78, 0.62], // 붉은 톤 (소수)
];

/**
 * 이미지 없이 코드로 만드는 딥스페이스 별밭.
 * - THREE.Points 하나로 수천 개 별을 그린다(성능 좋음).
 * - 커스텀 셰이더로 별마다 다른 크기·색·반짝임(twinkle)을 준다.
 * - 카메라 뒤쪽 깊은 곳에 배치해 앞의 별자리(FloatingDots)와 시차(깊이)를 만든다.
 */
export function Starfield({ count = 1800, reducedMotion = false }: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  // 별 속성(위치·색·크기·반짝임 위상)을 한 번만 생성
  const geometry = useMemo(() => {
    const rand = seededRandom(73145209);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const twinkle = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 화면(특히 와이드/울트라와이드)의 좌우 끝까지 덮도록 넉넉히 넓은 상자에 분포.
      // 먼 별(z가 작을수록 원근상 좁아짐)까지 가장자리를 덮으려면 X 폭이 충분히 커야 한다.
      positions[i * 3 + 0] = (rand() - 0.5) * 84;
      positions[i * 3 + 1] = (rand() - 0.5) * 52;
      positions[i * 3 + 2] = -6 - rand() * 18;

      const c = STAR_PALETTE[Math.floor(rand() * STAR_PALETTE.length)];
      // 밝기를 별마다 조금씩 흩뜨려 원근/농담을 만든다
      const b = 0.55 + rand() * 0.45;
      colors[i * 3 + 0] = c[0] * b;
      colors[i * 3 + 1] = c[1] * b;
      colors[i * 3 + 2] = c[2] * b;

      // 대부분 작은 별, 소수만 크게(딥필드 특유의 분포) — 전체적으로 키움
      const sizeRoll = rand();
      sizes[i] =
        sizeRoll < 0.8
          ? 1.4 + rand() * 1.2 // 작은 별(다수)
          : sizeRoll < 0.96
            ? 2.8 + rand() * 1.8 // 중간 별
            : 5.0 + rand() * 3.0; // 밝은 별(소수)

      phases[i] = rand() * Math.PI * 2;
      twinkle[i] = 0.15 + rand() * 0.6; // 반짝임 속도(느리게)
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 1));
    return geo;
  }, [count]);

  // 별마다 크기/색/반짝임을 다르게 주기 위한 커스텀 셰이더
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        // 픽셀 크기 스케일 — 화면 높이·픽셀비에 맞춰 일정하게 보이도록
        uScale: { value: 1 },
        uReduced: { value: reducedMotion ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aTwinkle;
        uniform float uTime;
        uniform float uScale;
        uniform float uReduced;
        varying vec3 vColor;
        varying float vTw;

        void main() {
          vColor = aColor;
          // 반짝임: 별마다 다른 위상/속도로 밝기가 오르내린다
          float tw = uReduced > 0.5
            ? 1.0
            : 0.82 + 0.18 * sin(uTime * aTwinkle + aPhase);
          vTw = tw;

          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // 원근 감쇠(sizeAttenuation): 멀수록 작게
          gl_PointSize = aSize * uScale * tw / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTw;

        void main() {
          // 원형 별 + 부드러운 가장자리(사각형 점 방지)
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float core = smoothstep(0.5, 0.0, d);
          // 밝은 중심 + 은은한 후광
          float alpha = pow(core, 1.6);
          gl_FragColor = vec4(vColor * (0.8 + 0.6 * vTw), alpha);
        }
      `,
    });
  }, [reducedMotion]);

  matRef.current = material;

  // 화면 크기/픽셀비에 맞춰 별 픽셀 크기 보정
  useFrame((state, delta) => {
    material.uniforms.uScale.value =
      (size.height * viewport.dpr) / 55; // 값이 클수록 별이 커짐(취향에 맞게 조절)

    if (!reducedMotion) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      const pts = pointsRef.current;
      if (pts) {
        // 아주 느린 드리프트 + 미세한 포인터 시차
        pts.rotation.y += Math.min(delta, 0.05) * 0.008;
        pts.rotation.x = -state.pointer.y * 0.02;
      }
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

/** 부드러운 원형 그라디언트 텍스처(외부 이미지 없이 canvas 로 생성) */
function makeSoftTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** 딥필드의 은은한 색 구름(성운) — 매우 낮은 불투명도의 큰 발광 얼룩 */
const NEBULAE: Array<{ pos: [number, number, number]; scale: number; color: string }> = [
  { pos: [-9, 3, -24], scale: 22, color: '#2a2960' }, // 보라
  { pos: [11, -4, -26], scale: 26, color: '#173a55' }, // 청록
  { pos: [3, 6, -28], scale: 18, color: '#3a2246' }, // 자주
];

/**
 * 배경에 깔리는 아주 흐릿한 색 성운.
 * AdditiveBlending 으로 검은 배경 위에 은은한 색 농담만 얹는다.
 */
export function Nebula() {
  const tex = useMemo(makeSoftTexture, []);
  const materials = useMemo(
    () =>
      NEBULAE.map(
        (n) =>
          new THREE.SpriteMaterial({
            map: tex,
            color: n.color,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [tex],
  );

  return (
    <group>
      {NEBULAE.map((n, i) => (
        <sprite key={i} position={n.pos} scale={n.scale} material={materials[i]} />
      ))}
    </group>
  );
}
