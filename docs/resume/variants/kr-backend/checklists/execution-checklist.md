# v1-v3 실행 체크리스트

작성일: 2026-02-22  
기준 문서: `docs/resume/variants/kr-backend/plan/section-tone-matrix.md`

## 공통 게이트

- [x] 원본 섹션/문장 톤 분해 완료
- [x] 국내 백엔드 JD 키워드 매핑 근거 문서화
- [x] v1/v2/v3 초안 작성
- [x] 성과지표 문장 비율 산출 자동화 스크립트 작성
- [ ] 각 변형안 PR 본문에 체크리스트 포함

## ST-01 (v1) JD 매칭형

- 목표: 1차 스크리닝에서 핵심역량/성과를 3분 내 파악 가능하게 구성
- 결과물: `docs/resume/variants/kr-backend/markdown/resume-v1-jd-balanced.md`
- 완료 조건:
  - [x] JD 키워드(API/RDBMS/Cloud/운영/협업) 섹션 포함
  - [x] 최근 경력 사례별 문제-조치-성과 정리
  - [x] 정량 성과 문장 포함
- 증빙:
  - [x] `docs/resume/variants/kr-backend/reports/jd-keyword-mapping.md`
  - [x] `docs/resume/variants/kr-backend/reports/metrics-ratio.md`

## ST-02 (v2) 문제해결형

- 목표: 면접관 관점에서 문제 해결 사고 과정을 확인 가능한 구조
- 결과물: `docs/resume/variants/kr-backend/markdown/resume-v2-problem-solving.md`
- 완료 조건:
  - [x] 문제-판단-실행-결과 흐름 유지
  - [x] 실패 전파 차단/운영 자동화 사례 포함
  - [x] 팀 리드/협업 경험 포함
- 증빙:
  - [x] `docs/resume/variants/kr-backend/reports/jd-keyword-mapping.md`
  - [x] `docs/resume/variants/kr-backend/reports/metrics-ratio.md`

## ST-03 (v3) 아키텍처형

- 목표: 시니어 백엔드 채용의 기술 심층 면접 대비
- 결과물: `docs/resume/variants/kr-backend/markdown/resume-v3-architecture.md`
- 완료 조건:
  - [x] 설계 원칙과 트레이드오프 서술
  - [x] 신뢰성 패턴(멱등, Retry, DLQ, Audit) 명시
  - [x] 비용/운영 지표 개선 사례 포함
- 증빙:
  - [x] `docs/resume/variants/kr-backend/reports/jd-keyword-mapping.md`
  - [x] `docs/resume/variants/kr-backend/reports/metrics-ratio.md`

## 빌드/프리뷰 검증

- [x] `npm run docs:build` 성공 기록
- [x] `npm run docs:preview` URL 점검 결과 기록
- [x] 결과 문서 반영: `docs/resume/variants/kr-backend/reports/build-preview-check.md`
