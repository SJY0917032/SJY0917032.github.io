# 로컬 빌드/프리뷰 점검 결과

작성일: 2026-02-22

## 빌드

- 상태: PASS
- 명령: `npm run docs:build`
- 실행 시각(UTC): `2026-02-22T13:59:53Z`
- 결과:
  - VitePress build complete
  - 소요 시간: 약 3.06s

## 선행 조치

- `vitepress: command not found` 오류가 있어 `npm install` 선행 실행
- 의존성 설치 후 동일 명령 재실행 시 정상 통과

## 프리뷰

- 상태: PASS
- 명령: `npm run docs:preview -- --host 127.0.0.1 --port 4173`
- 점검 URL:
  - `http://127.0.0.1:4173/resume/variants/kr-backend/`
  - `http://127.0.0.1:4173/resume/variants/kr-backend/markdown/resume-v1-jd-balanced`
  - `http://127.0.0.1:4173/resume/variants/kr-backend/markdown/resume-v2-problem-solving`
  - `http://127.0.0.1:4173/resume/variants/kr-backend/markdown/resume-v3-architecture`
- 결과:
  - `/resume/variants/kr-backend/` -> HTTP 200
  - `/resume/variants/kr-backend/markdown/resume-v1-jd-balanced` -> HTTP 200
  - `/resume/variants/kr-backend/markdown/resume-v2-problem-solving` -> HTTP 200
  - `/resume/variants/kr-backend/markdown/resume-v3-architecture` -> HTTP 200
