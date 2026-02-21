---
title: 실무 이야기
description: 실제 서비스를 운영하면서 마주친 문제들과 그 해결 과정
---

# 실무 이야기

실제 서비스를 운영하면서 마주친 문제들과 그 해결 과정을 기록했다.

## 글 목록

### 아키텍처 & 설계

- [공급사 6곳의 API를 하나로 — 통합 어댑터 레이어 설계기](./api-gateway-layer)
- [예약 성공, 결제 실패 — 분산 트랜잭션 없이 일관성 확보하기](./distributed-transaction)
- [인천공항이 네 가지 이름으로 저장된 이유 — 공급사 데이터 정규화](./data-normalization)

### 인프라 & 비용

- [AWS 인프라 비용 92% 절감 — DocumentDB TTL 아카이빙과 RabbitMQ 전환](./infra-cost-reduction)

### 자동화 & 운영

- [인수증 발송 파이프라인 재설계 — GAS에서 NestJS + SQS + Lambda로](./invoice-pipeline)
- [레거시 TMS 연동 개편 — 인터페이스 추상화와 재시도 설계](./legacy-tms-refactor)
- [수기 결제 자동화 — 토스페이먼츠 정기결제와 PG 추상화 설계](./payment-automation)
- [Google Sheets에서 NestJS 어드민으로 — 팀 계층 RBAC 설계](./admin-rbac)
