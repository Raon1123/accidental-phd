// 화면 문자열(한국어). 코드에 문장을 직접 쓰지 않는다(결정 기록 0001). 다른 언어는 같은 키로 파일을 더한다.
export const ko = {
  title: '어쩌다 박사: 한국 연구자의 일생',
  skipToMain: '본문 건너뛰기',
  loading: '데이터를 읽는 중입니다.',
  loadFailed: '데이터를 읽지 못했습니다.',
  newLifeAllLuck: '새 삶 시작 (전부 운에 맡기기)',
  saveNow: '지금 상태 저장',
  archiveHeading: '최근 기록',
  archiveEmpty: '저장한 기록이 없습니다.',
  open: '불러오기',
  currentHeading: '지금 삶',
  noLife: '아직 시작한 삶이 없습니다.',
  seed: '씨앗',
  stage: '단계',
  month: '진행 개월',
  track: '트랙',
  school: '학교',
  funding: '자금',
  savedAt: '저장 시각',
  creativeNotice: '이 게임의 학교 이름과 사건은 가상이며, 확률은 공개 통계와 설계 가정에서 왔습니다.',
} as const;
export type Strings = typeof ko;
