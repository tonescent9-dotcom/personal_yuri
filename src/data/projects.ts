export type Project = {
  id: number;
  title: string;
  category: string;
  description: string;
  year: string;
  href: string;
  /**
   * 카드 배경으로 쓰이는 CSS gradient.
   * 실제 이미지가 준비되면 이 값을 `url(...)` 로 교체하면 됩니다.
   */
  gradient: string;
  /**
   * 글래스 카드에 은은하게 스며드는 프로젝트 고유의 빛(틴트) 색.
   * 반투명 유리 위에 낮은 불투명도로 얹혀 카드마다 다른 무드를 준다.
   */
  tint: string;
};

/*
  =========================================================================
  프로젝트 데이터
  -------------------------------------------------------------------------
  카드 내용을 바꾸려면 이 배열만 수정하세요.
  이미지가 준비되면 gradient 대신 실제 이미지 경로를 넣을 수 있습니다.
  =========================================================================
*/
export const projects: Project[] = [
  {
    id: 1,
    title: 'ON-Mauel',
    category: 'Personal · UX/UI App',
    description: '동네 이웃을 연결하는 개인 UX/UI 앱 프로젝트.',
    year: '2026',
    href: '#',
    gradient: 'linear-gradient(135deg, #1b1f3a 0%, #3a2f5b 55%, #6c5ce7 100%)',
    tint: 'rgba(124, 108, 255, 0.30)',
  },
  {
    id: 2,
    title: 'Marshall Speaker',
    category: 'Team · Web Renewal',
    description: '브랜드 무드를 살린 팀 웹사이트 리뉴얼 프로젝트.',
    year: '2026',
    href: '#',
    gradient: 'linear-gradient(135deg, #14161c 0%, #2b2013 60%, #b8862f 100%)',
    tint: 'rgba(214, 162, 74, 0.28)',
  },
  {
    id: 3,
    title: 'Wine Community',
    category: 'Team · Community + AI',
    description: '와인 커뮤니티 챗봇 앱.',
    year: '2026',
    href: '#',
    gradient: 'linear-gradient(135deg, #1a0f1a 0%, #3d1530 55%, #8e2d5a 100%)',
    tint: 'rgba(214, 74, 138, 0.30)',
  },
  {
    id: 4,
    title: 'Clone Coding Lab',
    category: 'Study · Clone Coding',
    description: '레이아웃과 인터랙션을 익히기 위한 웹사이트 클론 모음.',
    year: '2026',
    href: '#',
    gradient: 'linear-gradient(135deg, #0f1720 0%, #16303a 60%, #2f8f9d 100%)',
    tint: 'rgba(74, 190, 205, 0.28)',
  },
];
