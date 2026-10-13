# accidental-phd

연구자 life-cycle 시뮬레이션 게임. [1 in 8 Billion](https://1in8b.life/)의 "통계로 굴러가는 임의의 한 사람의 일생" 프레임을 한국 연구자의 삶으로 옮긴다. 친구가 만든 [어쩌다 박사 v3.5](https://accidental-phd.hslee0251.chatgpt.site/)를 고도화하되, 소스에 접근할 수 없으므로 이 repo에서 재구현하고 배포본은 수치 비교용 기준(oracle)으로만 쓴다. 플레이어는 계열·세부전공·학과·자금 경로까지 고르고, 그 선택이 확률을 바꾸되 결과를 결정하지는 않는다.

## 시작하기

```bash
npm test            # 검증기 단위 테스트
npm run validate    # 데이터 팩·출처·결정 기록·문서 링크 검사
```

작업을 고르는 법: [docs/waves/STATUS.md](docs/waves/STATUS.md)에서 현재 wave를 보고, 열린 issue를 claim한다. 규약은 [docs/workflow.md](docs/workflow.md).

## 문서 지도

- [설계 스펙](docs/superpowers/specs/2026-10-13-accidental-phd-planning-design.md) — 목표, 선택권 모델, 데이터 규율, wave, 협업 규약
- [Wave 0 계획](docs/superpowers/plans/2026-10-13-wave-0-planning.md)
- [협업 계약](docs/workflow.md) — 라벨, claim, handoff, 모델·effort 표
- [보드](docs/waves/STATUS.md) · [wave 파일](docs/waves/)
- [결정 기록](docs/design/decisions/)
- [프롬프트 세트](docs/prompts/) — Claude·ChatGPT 공용
- [v3.5 oracle 조사](docs/oracle/v35-recon.md)

## 데이터 규율

모든 수치는 `data/packs/<pack>/records.json`에 12개 필드(값·단위·출처·표·쪽·모집단·분모·연도·확인일·신뢰도·비고)로 들어간다. 분모 없는 비율과 출처 없는 수치는 CI가 거부한다. 서사(narratives) 팩은 원문을 저장하지 않고 장면의 구조만 요약한다. 학교는 공식 공시 데이터를 쓰되 화면에는 가상 이름을 표시한다.

## 출처와 라이선스

코드는 MIT. 1in8b.life와 어쩌다 박사 v3.5는 참고 대상이며 코드를 복사하지 않는다. 통계 출처는 `data/sources/registry.json`에 기록한다.
