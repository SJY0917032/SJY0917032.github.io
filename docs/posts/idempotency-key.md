---
title: "예약이 두 건 잡혔습니다"
description: 해외 렌터카 공급사 API 재시도 중 발생한 중복 예약 문제와 trackingId 멱등키로 해결한 이야기
tags: [idempotency, nestjs, typescript, api-integration, rental-car]
---

# 예약이 두 건 잡혔습니다

슬랙 알림이 왔다. CS팀이었다.

> "고객이 같은 예약이 두 개라고 합니다. 결제도 두 번 됐고요."

오전 10시였다. 커피를 내리다 말고 노트북을 열었다.

---

## 무슨 일이 있었나

로그를 뒤졌다. 고객이 예약 버튼을 한 번 눌렀는데, 공급사 쪽에 예약이 두 건 생성돼 있었다. 예약 번호도 다르고, 생성 시각도 약 30초 차이가 났다.

우리 서버 로그에는 예약 요청이 두 번 기록돼 있었다. 첫 번째 요청은 타임아웃으로 실패 처리됐고, 두 번째 요청은 성공으로 끝났다.

문제는 첫 번째 요청이 실제로는 실패하지 않았다는 거다. 공급사 서버에서 예약은 이미 만들어졌는데, 응답을 돌려주는 도중에 연결이 끊겼던 것이다. 우리 서버는 타임아웃으로 판단하고 재시도했고, 공급사는 새 요청으로 받아서 예약을 또 만들었다.

---

## 해외 공급사 API의 현실

카모아는 해외 렌터카 공급사 6곳과 연동돼 있다. 공급사마다 독립된 ECS 래핑 서버를 두고 있는데, 이 래핑 서버들이 실제 공급사 API를 호출한다.

해외 API는 국내 API랑 다르다. 응답 시간이 5초에서 길면 30초까지 걸린다. 네트워크 경로도 길고, 공급사 서버 상태에 따라 들쭉날쭉하다. 타임아웃을 짧게 잡으면 멀쩡한 요청도 실패 처리되고, 길게 잡으면 사용자가 30초를 기다려야 한다.

그래서 타임아웃 후 재시도는 불가피한 선택이었다. 문제는 재시도가 "이전 요청이 실패했다"는 보장 없이 이뤄진다는 점이다.

```
클라이언트 → 래핑 서버 → 공급사 API
                              ↓
                         예약 생성됨
                              ↓
                         응답 전송 중...
                              ↓
                         연결 끊김 (타임아웃)
                              
래핑 서버: "실패했네, 재시도하자"
공급사 API: "새 요청이네, 예약 또 만들자"
```

이 구조에서 재시도는 언제든 중복을 만들 수 있다.

---

## 첫 번째 시도: 내부 중복 체크

처음엔 우리 DB에서 막으려 했다. 같은 고객, 같은 날짜, 같은 차종으로 일정 시간 내에 예약이 들어오면 중복으로 판단하는 방식이었다.

동작은 했다. 근데 허점이 있었다.

공급사마다 차종 코드 체계가 다르다. 어떤 공급사는 `CCAR`, 어떤 공급사는 `ECONOMY_4DOOR`를 쓴다. 같은 차를 다른 코드로 표현하면 중복 체크를 통과해버린다. 날짜 비교도 시간대 처리가 공급사마다 달라서 엣지 케이스가 계속 나왔다.

무엇보다 이 방식은 "비슷해 보이는 요청"을 막는 거지, "완전히 같은 요청"을 막는 게 아니었다.

---

## trackingId: 멱등키 도입

근본적인 해결책은 공급사 쪽에서 막는 거였다. 공급사 API 스펙을 다시 읽었더니 `trackingId` 파라미터가 있었다. 문서에는 이렇게 적혀 있었다.

> "If a request with the same trackingId is received, the existing reservation will be returned instead of creating a new one."

멱등키였다. 클라이언트가 고유한 ID를 만들어서 요청에 담아 보내면, 공급사가 그 ID를 기준으로 중복 여부를 판단한다. 같은 ID로 요청이 두 번 오면 두 번째 요청에서 첫 번째 예약을 그대로 돌려준다.

구현은 별거 없었다.

```typescript
// 예약 요청 시작 시점에 trackingId 생성
const trackingId = `${customerId}-${Date.now()}-${crypto.randomUUID()}`;

// 공급사 API 호출
const reservation = await this.supplierClient.createReservation({
  ...reservationParams,
  trackingId,
});
```

`trackingId`는 예약 요청이 시작될 때 한 번 만들어진다. 재시도가 발생해도 같은 `trackingId`를 쓴다. 공급사는 이 ID를 보고 "이미 처리한 요청"임을 알고 기존 예약을 반환한다.

```typescript
// 재시도 로직
async createReservationWithRetry(
  params: ReservationParams,
  trackingId: string,
  maxRetries = 3,
): Promise<Reservation> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.supplierClient.createReservation({
        ...params,
        trackingId, // 재시도마다 같은 trackingId 사용
      });
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      if (!isRetryableError(error)) throw error;
      
      await sleep(exponentialBackoff(attempt));
    }
  }
}
```

핵심은 `trackingId`가 재시도 루프 바깥에서 생성된다는 거다. 루프 안에서 만들면 매번 새 ID가 생기고, 멱등키의 의미가 없어진다.

---

## 내부 방어선도 추가

공급사가 `trackingId`를 지원한다고 해서 완전히 믿을 수는 없었다. 공급사 구현이 버그가 있을 수도 있고, 일부 공급사는 `trackingId`를 제대로 처리하지 않을 수도 있었다.

그래서 내부에도 방어선을 뒀다.

```typescript
// 예약 생성 전 trackingId 기반 중복 체크
const existing = await this.reservationRepository.findByTrackingId(trackingId);
if (existing) {
  return existing; // 이미 처리된 요청이면 기존 결과 반환
}

// DB unique constraint로 최종 방어
// reservation 테이블에 tracking_id unique index 추가
```

DB 레벨에서 `tracking_id`에 unique constraint를 걸었다. 애플리케이션 레벨 체크를 통과하더라도, 동시에 두 요청이 들어오는 레이스 컨디션 상황에서 DB가 최종적으로 막아준다.

```sql
ALTER TABLE reservations 
ADD CONSTRAINT uq_tracking_id UNIQUE (tracking_id);
```

레이어를 정리하면 이렇다.

```
1. 공급사 API: trackingId로 중복 요청 감지 → 기존 예약 반환
2. 애플리케이션: DB에서 trackingId 조회 → 기존 결과 반환  
3. DB: unique constraint → 중복 insert 차단
```

세 레이어가 각자 독립적으로 동작한다. 하나가 뚫려도 다음이 막는다.

---

## 멱등키가 해결하는 건 "중복 방지"가 아니다

처음엔 멱등키를 "중복 예약 방지 기능"으로 이해했다. 근데 쓰다 보니 더 정확한 표현은 "안전한 재시도를 위한 장치"였다.

중복 방지가 목적이었다면 재시도 자체를 막으면 된다. 근데 그러면 타임아웃 후 실제로 실패한 요청도 복구할 수 없다. 사용자는 예약이 됐는지 안 됐는지 모르는 상태로 남는다.

멱등키는 재시도를 허용하면서도 결과를 일관되게 만든다. 요청이 몇 번 오든 결과는 하나다. 첫 번째 요청이 성공했으면 두 번째 요청은 그 결과를 돌려준다. 첫 번째 요청이 실제로 실패했으면 두 번째 요청이 새로 처리된다.

```
trackingId = "abc-123"

1번 요청 (trackingId: abc-123) → 예약 생성 → 응답 전 타임아웃
2번 요청 (trackingId: abc-123) → 공급사: "이미 있네" → 기존 예약 반환

결과: 예약 1건, 정상
```

```
trackingId = "abc-123"

1번 요청 (trackingId: abc-123) → 공급사 서버 다운 → 실제 실패
2번 요청 (trackingId: abc-123) → 공급사: "처음 보는 ID네" → 예약 생성

결과: 예약 1건, 정상
```

두 경우 모두 예약은 정확히 한 건이다. 재시도가 안전해진다.

---
