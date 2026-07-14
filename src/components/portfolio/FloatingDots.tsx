import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { DotConnections } from './DotConnections';

/** 하나의 점(dot)이 가지는 데이터 */
export type Dot = {
  id: number;
  position: [number, number, number];
  scale: number;
  speed: number;
  offset: number;
  tone: 'white' | 'purple' | 'blue';
  /** 반짝임 속도/위상 (점마다 달라 별처럼 제각각 반짝인다) */
  twinkleSpeed: number;
  twinklePhase: number;
};

type FloatingDotsProps = {
  /** 점 개수 (약 50~80 권장) */
  count?: number;
  /** 접근성: 모션 최소화 사용자 여부 */
  reducedMotion?: boolean;
  /** 가까운 점들을 잇는 연결선 표시 여부 */
  showConnections?: boolean;
};

/** 톤별 색상 — 회색이 아닌 따뜻한 아이보리 톤이 기본, 보라/파랑은 은은한 강조 */
const TONE_COLOR: Record<Dot['tone'], string> = {
  white: '#fff4dd', // 아이보리
  purple: '#c3b5ff',
  blue: '#9cc0ff',
};

const BASE_EMISSIVE = 1.7; // 점의 기본 발광 세기 (toneMapped=false 라 1 이상이면 밝게 빛남)
const TWINKLE_AMP = 0.85; // 반짝임 진폭 (기본 세기 위아래로 오르내림)
const FLASH_BOOST = 3.0; // 빛이 도착했을 때 얹히는 순간 밝기
const MAX_PULSES = 6; // 동시에 이동 가능한 빛의 최대 개수

/** 이동 중인 빛(pulse)의 상태 */
type Pulse = {
  active: boolean;
  from: number;
  to: number;
  t: number;
  speed: number;
  prev: number;
  hops: number;
};

/*
  결정론적 의사난수 (매 렌더링마다 위치가 바뀌지 않도록 seed 기반).
  Math.random 대신 사용해 useMemo 안에서 안정적인 배치를 만든다.
*/
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 부드러운 원형 그라디언트 광채 텍스처(외부 이미지 없이 canvas 로 생성) */
function makeGlowTexture(): THREE.Texture {
  const size = 128;
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
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const noRaycast = () => null;

/**
 * 3D 공간에 떠 있는 작은 빛나는 점들의 그룹.
 * - useMemo 로 점 데이터 / 연결 그래프를 한 번만 생성
 * - useFrame + ref 로 애니메이션 (state 변경 없음)
 * - 점을 클릭하면 연결을 따라 빛이 이웃 점으로 계속 옮겨간다
 * - 마우스로 쥐고(드래그) 움직이면 그룹 전체가 회전한다
 */
export function FloatingDots({
  count = 70,
  reducedMotion = false,
  showConnections = true,
}: FloatingDotsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dotRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pulseRefs = useRef<Array<THREE.Group | null>>([]);
  const gl = useThree((s) => s.gl);

  // 드래그 회전 상태 (React state 대신 ref → 리렌더 없음)
  const drag = useRef({
    dragging: false, // 회전이 실제로 켜졌는지
    moved: false, // 클릭(빛 발사)과 구분하기 위한 이동 여부
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    dx: 0,
    dy: 0,
    rotX: 0,
    rotY: 0,
  });

  // 점 데이터 + 연결(edge) + 인접 그래프(adjacency) 생성 (안정적 배치)
  const { dots, edges, adjacency } = useMemo(() => {
    const rand = seededRandom(20260714);
    const list: Dot[] = Array.from({ length: count }, (_, i) => {
      const toneRoll = rand();
      const tone: Dot['tone'] =
        toneRoll > 0.9 ? 'purple' : toneRoll > 0.8 ? 'blue' : 'white';
      // 크기를 3단계로 섞는다: 작은 점(다수) · 중간 점 · 약간 큰 점(소수)
      const sizeRoll = rand();
      const scale =
        sizeRoll < 0.58
          ? 0.011 + rand() * 0.005 // 작은 점
          : sizeRoll < 0.86
            ? 0.02 + rand() * 0.008 // 중간 점
            : 0.032 + rand() * 0.012; // 약간 큰 점
      return {
        id: i,
        position: [
          (rand() - 0.5) * 12,
          (rand() - 0.5) * 7,
          (rand() - 0.5) * 6 - 1,
        ],
        scale,
        speed: 0.3 + rand() * 0.7,
        offset: rand() * Math.PI * 2,
        tone,
        twinkleSpeed: 1.2 + rand() * 3.0,
        twinklePhase: rand() * Math.PI * 2,
      };
    });

    // 가까운 점들만 연결 (빛의 이동 경로와 동일한 그래프)
    const edgeList: [number, number][] = [];
    const adj: number[][] = list.map(() => []);
    const linkCount = new Array<number>(count).fill(0);
    const maxDistance = 2.7;
    const maxLinks = 4;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (linkCount[i] >= maxLinks || linkCount[j] >= maxLinks) continue;
        const a = list[i].position;
        const b = list[j].position;
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= maxDistance) {
          edgeList.push([i, j]);
          adj[i].push(j);
          adj[j].push(i);
          linkCount[i] += 1;
          linkCount[j] += 1;
        }
      }
    }
    return { dots: list, edges: edgeList, adjacency: adj };
  }, [count]);

  // 빛이 도착한 점에 순간적으로 얹히는 밝기(반짝임과 분리해 관리) — 매 프레임 감쇠
  const flash = useMemo(() => new Float32Array(count), [count]);

  // 공유 지오메트리
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const pulseGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);
  const glowTex = useMemo(makeGlowTexture, []);

  // 점마다 개별 머티리얼.
  // - 큰 블러 광채(halo) 없이 점 "그 크기 그대로" 밝게 빛나 보이게 한다.
  // - toneMapped=false + emissiveIntensity>1 로 어두운 배경에서 또렷하게 발광.
  // - 개별 머티리얼이라 빛이 도착한 점만 순간적으로 더 밝힐 수 있다.
  const dotMaterials = useMemo(
    () =>
      dots.map((d) => {
        const color = TONE_COLOR[d.tone];
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: BASE_EMISSIVE,
          roughness: 0.4,
          metalness: 0.0,
        });
        mat.toneMapped = false;
        return mat;
      }),
    [dots],
  );

  // 이동하는 빛의 광채 머티리얼 (이동하는 빛만 살짝 번지게 해 눈에 띄게)
  const pulseHaloMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffffff',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [glowTex],
  );

  // 빛(pulse) 풀 — 고정 개수를 미리 만들어 재사용
  const pulses = useRef<Pulse[]>(
    Array.from({ length: MAX_PULSES }, () => ({
      active: false,
      from: 0,
      to: 0,
      t: 0,
      speed: 1,
      prev: -1,
      hops: 0,
    })),
  );

  // 점 클릭 → 빛 발사
  const spawnPulse = (index: number) => {
    const neighbors = adjacency[index];
    if (!neighbors || neighbors.length === 0) return;
    const slot = pulses.current.find((p) => !p.active);
    if (!slot) return;
    const to = neighbors[Math.floor(Math.random() * neighbors.length)];
    slot.active = true;
    slot.from = index;
    slot.to = to;
    slot.t = 0;
    slot.prev = index;
    slot.speed = 0.9 + Math.random() * 0.7;
    slot.hops = 8 + Math.floor(Math.random() * 8);
    // 출발 점을 즉시 밝힌다
    flash[index] = FLASH_BOOST;
  };

  // "쥐어서" 돌리기
  // - 마우스: 누르는 즉시 드래그로 회전
  // - 터치(모바일): 꾹 누르면(롱프레스) 회전 시작, 그 전에 움직이면 = 스크롤로 넘김
  //   회전 중일 때만 스크롤을 막아 평소 스크롤을 방해하지 않는다.
  useEffect(() => {
    const el = gl.domElement;
    const LONG_PRESS_MS = 350; // 이 시간 이상 누르고 있으면 회전 모드
    const CANCEL_MOVE = 12; // 롱프레스 전 이만큼 움직이면 스크롤로 판단해 취소
    let timer = 0;

    const startAt = (e: PointerEvent) => {
      const d = drag.current;
      d.downX = e.clientX;
      d.downY = e.clientY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.moved = false;
    };

    const onDown = (e: PointerEvent) => {
      startAt(e);
      if (e.pointerType === 'mouse') {
        drag.current.dragging = true;
        el.style.cursor = 'grabbing';
      } else {
        // 터치/펜: 롱프레스로 회전 시작
        drag.current.dragging = false;
        timer = window.setTimeout(() => {
          drag.current.dragging = true;
          drag.current.moved = true; // 회전을 켰으면 탭(빛 발사)로 오인하지 않게
          timer = 0;
        }, LONG_PRESS_MS);
      }
    };

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const dist = Math.hypot(e.clientX - d.downX, e.clientY - d.downY);
      if (dist > 4) d.moved = true;

      if (!d.dragging) {
        // 아직 회전 전: 많이 움직이면 스크롤 의도 → 롱프레스 취소
        if (timer && dist > CANCEL_MOVE) {
          clearTimeout(timer);
          timer = 0;
        }
        d.lastX = e.clientX;
        d.lastY = e.clientY;
        return;
      }
      // 회전 중: 이동량 누적 (마우스/터치 공통)
      d.dx += e.clientX - d.lastX;
      d.dy += e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
    };

    // 회전 중일 때만 스크롤(터치 이동) 차단
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current.dragging) e.preventDefault();
    };

    const onUp = () => {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
      drag.current.dragging = false;
      if (el.style.cursor === 'grabbing') el.style.cursor = 'grab';
    };

    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('touchmove', onTouchMove);
      el.style.cursor = '';
    };
  }, [gl]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.05); // 탭 비활성 후 튐 방지

    // ---- 그룹 회전 (드래그 + 은은한 자동 회전 + 미세 포인터 기울기) ----
    const d = drag.current;
    if (d.dragging) {
      d.rotY += d.dx * 0.005;
      d.rotX = THREE.MathUtils.clamp(d.rotX - d.dy * 0.005, -0.8, 0.8);
    }
    d.dx = 0;
    d.dy = 0;
    if (!d.dragging && !reducedMotion) {
      d.rotY += dt * 0.05; // 자동 저속 회전
    }
    const tiltX = reducedMotion ? 0 : -state.pointer.y * 0.08;
    const tiltY = reducedMotion ? 0 : state.pointer.x * 0.08;
    const lerp = d.dragging ? Math.min(1, dt * 12) : Math.min(1, dt * 3);
    group.rotation.x += (d.rotX + tiltX - group.rotation.x) * lerp;
    group.rotation.y += (d.rotY + tiltY - group.rotation.y) * lerp;

    // ---- 각 점: 부유 + 발광 세기 감쇠 ----
    const t = state.clock.elapsedTime;
    for (let i = 0; i < dots.length; i++) {
      const mesh = dotRefs.current[i];
      const dot = dots[i];
      if (mesh && !reducedMotion) {
        mesh.position.y = Math.sin(t * dot.speed + dot.offset) * 0.12;
      }
      // 반짝임: 점마다 다른 위상으로 밝기가 오르내린다. 여기에 도착 flash 를 더한다.
      const twinkle = reducedMotion
        ? BASE_EMISSIVE
        : BASE_EMISSIVE + Math.sin(t * dot.twinkleSpeed + dot.twinklePhase) * TWINKLE_AMP;
      dotMaterials[i].emissiveIntensity = twinkle + flash[i];
      flash[i] -= flash[i] * Math.min(1, dt * 3.2); // 감쇠
    }

    // ---- 이동하는 빛(pulse) ----
    for (let idx = 0; idx < pulses.current.length; idx++) {
      const p = pulses.current[idx];
      const g = pulseRefs.current[idx];
      if (!g) continue;
      if (!p.active) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      p.t += dt * p.speed;

      // 한 프레임에 여러 구간을 지날 수도 있으므로 while 로 처리
      while (p.t >= 1 && p.active) {
        p.t -= 1;
        const arrived = p.to;
        flash[arrived] = FLASH_BOOST; // 도착 점 밝힘
        p.hops -= 1;
        if (p.hops <= 0) {
          p.active = false;
          g.visible = false;
          break;
        }
        const cameFrom = p.from;
        let next = adjacency[arrived].filter((n) => n !== cameFrom);
        if (next.length === 0) next = adjacency[arrived]; // 막다른 곳이면 되돌아감 허용
        if (next.length === 0) {
          p.active = false;
          g.visible = false;
          break;
        }
        p.prev = cameFrom;
        p.from = arrived;
        p.to = next[Math.floor(Math.random() * next.length)];
      }
      if (!p.active) continue;

      const a = dots[p.from].position;
      const b = dots[p.to].position;
      const tt = clamp01(p.t);
      g.position.set(
        a[0] + (b[0] - a[0]) * tt,
        a[1] + (b[1] - a[1]) * tt,
        a[2] + (b[2] - a[2]) * tt,
      );
    }
  });

  return (
    <group ref={groupRef}>
      {dots.map((dot, i) => (
        <group key={dot.id} position={dot.position}>
          {/* 점 그 크기만큼만 밝게 빛나는 코어 (큰 블러 광채 없음) */}
          <mesh
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            scale={dot.scale}
            geometry={sphereGeo}
            material={dotMaterials[i]}
          />
          {/* 클릭 판정용 투명 히트 영역 (점이 작아서 넉넉하게) */}
          <mesh
            scale={Math.max(dot.scale * 6, 0.18)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              if (!drag.current.moved) spawnPulse(i);
            }}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* 이동하는 빛(pulse) 풀 */}
      {pulses.current.map((_, idx) => (
        <group
          key={`pulse-${idx}`}
          ref={(el) => {
            pulseRefs.current[idx] = el;
          }}
          visible={false}
        >
          <mesh geometry={pulseGeo} scale={0.035}>
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <sprite scale={0.28} material={pulseHaloMaterial} raycast={noRaycast} />
        </group>
      ))}

      {showConnections && <DotConnections dots={dots} edges={edges} />}
    </group>
  );
}
