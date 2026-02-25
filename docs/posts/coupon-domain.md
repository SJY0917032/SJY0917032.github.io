---
title: "쿠폰이 예약 코드 안에 있으면 안 되는 이유"
description: "렌터카 예약 서비스에 강결합된 쿠폰 로직을 독립 도메인으로 분리한 이야기. 직접 호출이면 충분한데 왜 이벤트 주도를 택했는가."
tags: ["NestJS", "DDD", "EventEmitter", "리팩토링", "도메인분리"]
---

# 쿠폰이 예약 코드 안에 있으면 안 되는 이유

쿠폰은 예약이 아니다. 근데 우리 코드에서는 예약이었다.

`CarReservationService` 안에 쿠폰 발급 로직이 박혀 있었다. 예약을 완료하면 쿠폰을 발급하고, 예약을 취소하면 쿠폰을 회수하고, 예약 상태가 바뀌면 쿠폰 상태도 같이 바뀌었다. 코드 구조만 보면 쿠폰이 렌터카 예약의 하위 개념처럼 보였다.

그게 문제였다.

---

## 기존 구조가 어떻게 생겼는지

렌터카 예약 서비스는 대략 이런 모양이었다.

```typescript
// CarReservationService
async completeReservation(reservationId: number) {
  // 예약 완료 처리
  await this.reservationRepository.updateStatus(reservationId, 'COMPLETED');

  // 쿠폰 발급 (예약 서비스 안에 직접 박혀 있음)
  const user = await this.userRepository.findOne(userId);
  if (user.isFirstReservation) {
    await this.couponRepository.issue({
      userId,
      couponType: 'FIRST_RESERVATION',
      expiredAt: addDays(new Date(), 30),
    });
  }

  // 포인트 적립, 알림 발송...
}
```

쿠폰 발급 조건이 바뀌면 `CarReservationService`를 열어야 했다. 쿠폰 만료일 정책이 바뀌어도 마찬가지였다. 쿠폰 테이블 스키마가 바뀌면 예약 서비스 테스트가 깨졌다.

이건 단순히 "코드가 지저분하다"는 미적 문제가 아니다. 쿠폰의 변경이 예약의 안정성을 위협하는 구조적 문제다.

---

## PHP 스크립트가 왜 문제였나

더 심각한 건 따로 있었다. 일부 쿠폰 발급은 PHP 스크립트를 수동으로 실행하는 방식으로 운영되고 있었다.

신규 가입 쿠폰, 특정 이벤트 쿠폰 같은 경우 자동화가 안 돼 있었다. 담당자가 직접 서버에 접속해서 스크립트를 돌렸다. 월 5건 정도 누락이 발생했다. 발급이 안 됐다는 CS가 들어오면 그때서야 확인하고 수동으로 처리했다. 한 건 처리하는 데 30분이 걸렸다.

30분이 길어 보이지 않을 수 있다. 근데 이건 단순히 시간 낭비가 아니다. 수동 실행이라는 행위 자체가 리스크다. 누가 실행했는지, 언제 실행했는지, 중복 실행은 없었는지 추적이 안 된다. 롤백도 없다. 실수가 나면 데이터를 직접 고쳐야 한다.

자동화할 수 있는 걸 수동으로 하고 있다는 건, 그 부분이 시스템의 신뢰 범위 밖에 있다는 뜻이다.

---

## 비즈니스 요구가 터진 순간

2024년 초, 호텔 상품 출시가 결정됐다. 렌터카만 팔던 카모아가 호텔 예약도 시작하는 거였다.

그리고 당연하게도 "호텔 예약에도 쿠폰 적용해야 하지 않나요?"라는 요구가 나왔다.

기존 구조로는 불가능했다. 쿠폰 로직이 `CarReservationService` 안에 있으니까. 호텔 예약에 쿠폰을 붙이려면 `HotelReservationService`에도 똑같은 쿠폰 코드를 복붙해야 했다. 그러면 쿠폰 정책이 바뀔 때마다 두 군데를 동시에 고쳐야 한다. 나중에 항공권이나 패키지 상품이 추가되면 세 군데, 네 군데가 된다.

이 시점에서 선택지는 두 가지였다.

1. 지금 당장 복붙하고 나중에 고친다.
2. 지금 제대로 분리한다.

1번을 택하면 기술 부채가 쌓이는 속도가 비즈니스 확장 속도를 따라간다. 상품군이 늘어날수록 쿠폰 관련 버그가 늘어나는 구조가 된다. 2번을 택하면 지금 당장 시간이 더 든다.

2번을 택했다.

---

## 도메인 분리 설계

쿠폰을 독립 모듈로 뽑아냈다. `CouponModule`은 쿠폰 발급, 사용, 회수, 조회에 대한 책임만 진다. 렌터카가 뭔지, 호텔이 뭔지 모른다.

```
CouponModule
├── CouponService       # 발급/사용/회수 핵심 로직
├── CouponRepository    # DB 접근
├── CouponEventHandler  # 이벤트 수신 및 발급 트리거
└── CouponPolicy        # 발급 조건 판단 (첫 예약, 신규 가입 등)
```

`CarReservationService`는 쿠폰을 직접 호출하지 않는다. 예약이 완료됐다는 사실만 알린다. 쿠폰이 그걸 듣고 알아서 처리한다.



---

## "직접 호출이면 안 되나?"

여기서 반론이 나온다. 도메인을 분리하더라도 `CarReservationService`에서 `CouponService.issue()`를 직접 호출하면 되지 않냐는 거다. 굳이 이벤트를 쓸 필요가 있냐고.

불가능한 건 아니다. 직접 호출도 동작은 한다.

근데 직접 호출은 의존 방향을 만든다. `CarReservationService`가 `CouponService`를 알아야 한다. 호텔 예약 서비스도 `CouponService`를 알아야 한다. 쿠폰 서비스 인터페이스가 바뀌면 모든 호출 지점을 찾아서 고쳐야 한다.

더 중요한 건 이거다. "예약 완료"라는 이벤트에 반응해야 하는 게 쿠폰만이 아닐 수 있다. 포인트 적립, 알림 발송, 통계 집계 같은 것들도 예약 완료에 반응한다. 이걸 전부 직접 호출로 연결하면 `CarReservationService`는 자기 책임 외의 것들을 줄줄이 알고 있어야 한다.

이벤트 주도는 이 문제를 뒤집는다. 예약 서비스는 "완료됐다"고 외치기만 한다. 누가 듣는지 모른다. 쿠폰이 듣든, 포인트가 듣든, 알림이 듣든 예약 서비스와 무관하다.

---

## EventEmitter 기반 구현

NestJS의 `@nestjs/event-emitter`를 썼다. 외부 메시지 브로커 없이 프로세스 내 이벤트 버스를 쓰는 방식이다.

```typescript
// CarReservationService
async completeReservation(reservationId: number) {
  await this.reservationRepository.updateStatus(reservationId, 'COMPLETED');

  this.eventEmitter.emit('reservation.completed', {
    reservationId,
    userId,
    productType: 'CAR',
  });
}
```

```typescript
// CouponEventHandler
@OnEvent('reservation.completed')
async handleReservationCompleted(payload: ReservationCompletedEvent) {
  const isFirstReservation = await this.couponPolicy.isFirstReservation(payload.userId);

  if (isFirstReservation) {
    await this.couponService.issue({
      userId: payload.userId,
      couponType: 'FIRST_RESERVATION',
    });
  }
}

@OnEvent('user.registered')
async handleUserRegistered(payload: UserRegisteredEvent) {
  await this.couponService.issue({
    userId: payload.userId,
    couponType: 'WELCOME',
  });
}
```

발급 조건 판단은 `CouponPolicy`가 담당한다. "첫 예약인지"를 판단하는 로직이 쿠폰 모듈 안에 있다. 예약 서비스가 "이 사람 첫 예약이니까 쿠폰 줘"라고 말하지 않는다. 예약 서비스는 그냥 "예약 완료됐어"라고만 한다.

호텔 예약이 추가됐을 때 변경된 코드는 딱 하나다.

```typescript
// HotelReservationService
this.eventEmitter.emit('reservation.completed', {
  reservationId,
  userId,
  productType: 'HOTEL',
});
```

`CouponEventHandler`는 건드리지 않았다. 이미 `reservation.completed` 이벤트를 듣고 있으니까.

---

## 결과

수치부터 말하면, 쿠폰 발급 소요 시간이 30분에서 1분으로 줄었다. 월 5건 발생하던 수동 발급 누락은 0건이 됐다.

근데 이 수치보다 더 중요한 변화가 있다.

쿠폰 정책이 바뀌어도 예약 서비스를 건드리지 않는다. 새 상품군이 추가돼도 쿠폰 모듈은 그대로다. 쿠폰 발급 조건을 테스트할 때 예약 서비스를 모킹할 필요가 없다.

코드가 비즈니스 구조를 반영하게 됐다. 쿠폰은 예약의 부속품이 아니다. 쿠폰은 독립적인 비즈니스 개념이고, 코드도 그렇게 생겨야 한다.

---

## 한 가지 트레이드오프

이벤트 주도 방식의 단점도 있다. 흐름이 명시적이지 않다. 코드를 처음 보는 사람은 `reservation.completed` 이벤트가 발생했을 때 어디서 처리되는지 바로 알기 어렵다. 직접 호출이었다면 IDE에서 바로 따라갈 수 있었을 거다.

이건 실제 단점이다. 무시하면 안 된다.

그래서 이벤트 핸들러 위치를 예측 가능하게 만드는 게 중요하다. `CouponEventHandler`, `PointEventHandler`처럼 핸들러 파일 이름을 명확하게 짓고, 이벤트 타입을 상수로 관리하면 어느 정도 완화된다. 완전히 없애진 못하지만, 감수할 만한 수준이 된다.

결합도를 낮추는 대가로 추적 가능성을 일부 포기하는 거다. 이 트레이드오프가 맞는 상황이 있고 아닌 상황이 있다. 상품군이 계속 늘어나는 플랫폼이라면 맞는 선택이었다고 생각한다.

---

쿠폰이 예약 코드 안에 있으면 안 되는 이유는 간단하다. 쿠폰은 예약이 아니기 때문이다. 코드가 그 사실을 모르고 있었을 뿐이다.
