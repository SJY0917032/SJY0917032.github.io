# 국내 백엔드 지원용 이력서 바리에이션 (v1-v3)

국내 백엔드 채용 공고 패턴을 기준으로 이력서를 3개 톤으로 재구성한 세트입니다.  
원본(`docs/resume/index.md`)의 사실·성과 데이터는 유지하고, 표현만 채용 스크리닝 친화적으로 정리했습니다.

## 바리에이션

- [v1. JD 매칭형 (한눈형)](/resume/variants/kr-backend/markdown/resume-v1-jd-balanced)
- [v2. 문제해결형 (성과형)](/resume/variants/kr-backend/markdown/resume-v2-problem-solving)
- [v3. 아키텍처형 (기술심화)](/resume/variants/kr-backend/markdown/resume-v3-architecture)

## 계획/검증 문서

- [섹션-톤 분해표](/resume/variants/kr-backend/plan/section-tone-matrix)
- [JD 키워드 매핑 근거](/resume/variants/kr-backend/reports/jd-keyword-mapping)
- [v1-v3 실행 체크리스트](/resume/variants/kr-backend/checklists/execution-checklist)
- [성과지표 문장 비율 리포트](/resume/variants/kr-backend/reports/metrics-ratio)
- [로컬 빌드/프리뷰 점검 결과](/resume/variants/kr-backend/reports/build-preview-check)

## 재생성 명령

```bash
npm run resume:kr:analyze
npm run docs:build
```
