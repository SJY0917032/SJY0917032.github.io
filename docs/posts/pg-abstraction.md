---
title: PG사 추상화 — 이니시스를 이틀 만에 붙인 증명
description: Strategy 패턴으로 PG 인터페이스를 설계하고, 실제로 이니시스 추가 요구가 왔을 때 Adapter 하나만 구현해서 비즈니스 로직을 한 줄도 안 바꾼 이야기
tags: [NestJS, TypeScript, 토스페이먼츠, 이니시스, PG, Strategy패턴, 추상화]
---

# PG사 추상화 — 이니시스를 이틀 만에 붙인 증명

"나중에 PG 바뀔 수 있으니 추상화합시다."

이 말을 회의에서 하면 돌아오는 대답은 보통 "지금 바쁜데요."다. 그것도 맞는 말이긴 하다. 추상화는 당장 눈에 보이는 결과물이 없다. 미래를 위한 투자라는 말은 설득력이 약하다. 경험이 없으면 더 그렇다.



토스페이먼츠로 정기결제를 구축하면서 PG 인터페이스를 추상화했다. 몇 달 뒤 이니시스 추가 요구가 실제로 왔다. `InicisAdapter` 하나를 구현했다. `PaymentService` 비즈니스 로직은 한 줄도 안 바꿨다. 이틀 걸렸다.



---

## 왜 처음부터 추상화했나

토스페이먼츠 API에 직접 의존하는 코드를 짜면 어떻게 되는지는 뻔하다. PG사를 바꿀 때 결제 관련 코드 전체를 뜯어야 한다. 어디서 토스 API를 호출하는지 찾아다니고, 응답 형태가 달라서 파싱 로직을 다 고치고, 테스트도 다시 짜야 한다.

인터페이스 하나를 사이에 두면 그 비용이 Adapter 하나 구현으로 줄어든다.

`PaymentService`는 PG사가 뭘지 모른다. 그냥 `IPgAdapter`를 호출한다. 어떤 PG사 Adapter가 주입되든 상관없다. 결과만 공통 형태로 받으면 된다.

```
PaymentService
    └── IPgAdapter (인터페이스)
            ├── TossPaymentsAdapter
            ├── InicisAdapter
            └── 미래의 PG사 Adapter
```

---

## 공통 인터페이스 설계

PG사마다 API 스펙이 다르다. 인증 방식, 요청 파라미터, 응답 형태가 전부 다르다. 그래도 결제 서비스 입장에서 필요한 동작은 같다. 빌링키 발급, 결제 실행, 취소, 상태 조회.

이걸 인터페이스로 고정했다.

```typescript
export interface IPgAdapter {
  issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKey>;
  charge(params: ChargeParams): Promise<PaymentResult>;
  cancel(params: CancelParams): Promise<CancelResult>;
  getStatus(paymentKey: string): Promise<PaymentStatus>;
}

export interface PaymentResult {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: 'DONE' | 'FAILED' | 'CANCELED';
  approvedAt: Date;
  pgProvider: 'TOSS' | 'INICIS';
}
```

`PaymentResult`가 핵심이다. 토스페이먼츠든 이니시스든, 결과는 이 형태로 반환한다. `PaymentService`는 이 타입만 알면 된다.

---

## 1차: 토스페이먼츠 Adapter

토스페이먼츠는 REST API 기반이라 구현이 깔끔하다. 빌링키로 결제를 실행하고, 응답을 `PaymentResult`로 변환해서 반환한다.

```typescript
@Injectable()
export class TossPaymentsAdapter implements IPgAdapter {
  constructor(
    private readonly httpClient: HttpService,
    @Inject('TOSS_SECRET_KEY') private readonly secretKey: string,
  ) {}

  async charge(params: ChargeParams): Promise<PaymentResult> {
    const response = await this.httpClient.post(
      `https://api.tosspayments.com/v1/billing/${params.billingKey}`,
      {
        customerKey: params.customerId,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
        },
      },
    );

    return {
      paymentKey: response.data.paymentKey,
      orderId: response.data.orderId,
      amount: response.data.totalAmount,
      status: response.data.status === 'DONE' ? 'DONE' : 'FAILED',
      approvedAt: new Date(response.data.approvedAt),
      pgProvider: 'TOSS',
    };
  }

  // issueBillingKey, cancel, getStatus 생략
}
```

`PaymentService`는 이렇게 쓴다.

```typescript
@Injectable()
export class PaymentService {
  constructor(
    @Inject('TOSS_PG') private readonly pgAdapter: IPgAdapter,
  ) {}

  async chargeSubscription(customer: Customer): Promise<void> {
    const result = await this.pgAdapter.charge({
      billingKey: customer.billingKey,
      amount: customer.subscriptionAmount,
      orderId: generateOrderId(),
      orderName: '구독 결제',
      customerId: customer.id,
    });

    await this.saveHistory(result, customer.id);
  }
}
```

`PaymentService`는 `IPgAdapter`만 안다. 토스페이먼츠라는 단어가 없다.

---

## 2차: 이니시스 추가 요구가 왔다

몇 달 뒤 실제로 이니시스 연동 요구가 왔다. 특정 고객군에 이니시스 결제를 적용해야 했다.

이니시스는 토스페이먼츠와 API 스펙이 완전히 다르다. 인증 방식이 HMAC 서명 기반이고, 요청 파라미터 이름도 다르고, 응답 코드 체계도 다르다. 같은 "결제 실행"이지만 구현은 전혀 다르다.

그래도 `IPgAdapter`를 구현하면 된다.

```typescript
@Injectable()
export class InicisAdapter implements IPgAdapter {
  constructor(
    private readonly httpClient: HttpService,
    @Inject('INICIS_MERCHANT_ID') private readonly merchantId: string,
    @Inject('INICIS_SIGN_KEY') private readonly signKey: string,
  ) {}

  async charge(params: ChargeParams): Promise<PaymentResult> {
    const timestamp = Date.now().toString();
    const signature = this.generateHmac(
      `billkey=${params.billingKey}&price=${params.amount}&timestamp=${timestamp}`,
    );

    const response = await this.httpClient.post(
      'https://iniapi.inicis.com/api/v1/billing',
      {
        mid: this.merchantId,
        timestamp,
        signature,
        billkey: params.billingKey,
        price: params.amount,
        goodname: params.orderName,
        buyername: params.customerId,
      },
    );

    // 이니시스 응답을 공통 형태로 변환
    return {
      paymentKey: response.data.tid,        // 이니시스는 tid
      orderId: params.orderId,
      amount: params.amount,
      status: response.data.resultCode === '0000' ? 'DONE' : 'FAILED',
      approvedAt: new Date(),
      pgProvider: 'INICIS',
    };
  }

  private generateHmac(data: string): string {
    return crypto
      .createHmac('sha256', this.signKey)
      .update(data)
      .digest('hex');
  }

  // issueBillingKey, cancel, getStatus 생략
}
```

이게 전부다. `InicisAdapter`를 구현하고, 모듈에 provider를 등록하고, 고객별 PG사 선택 로직에 case 한 줄 추가했다.

```typescript
private selectAdapter(customer: Customer): IPgAdapter {
  switch (customer.pgProvider) {
    case 'TOSS':   return this.tossAdapter;
    case 'INICIS': return this.inicisAdapter;  // 이 줄만 추가
    default: throw new Error(`지원하지 않는 PG사: ${customer.pgProvider}`);
  }
}
```

---

## PaymentService는 한 줄도 안 바꿨다



`chargeSubscription`, `cancelPayment`, Cron 스케줄러, Slack 알림 로직. 이니시스 추가 전과 후가 완전히 동일하다. `PaymentService`는 `IPgAdapter.charge()`를 호출할 뿐이고, 그 뒤에 뭐가 있는지 모른다.

변경된 파일 목록:
- `InicisAdapter` 신규 생성
- `PaymentModule` provider 등록 (3줄)
- `selectAdapter()` case 추가 (1줄)

건드리지 않은 파일:
- `PaymentService`
- `PaymentHistory` 엔티티
- Cron 스케줄러
- Slack 알림
- 테스트 코드 (기존 테스트 그대로 통과)

---

## 공통 인터셉터로 PG API 로깅

PG사 API 호출을 추적하는 것도 중요하다. 결제 실패가 났을 때 "PG사 API에 뭘 보냈고 뭘 받았는지"가 없으면 디버깅이 막막하다. CS팀이 "이 고객 결제 왜 실패했어요?"라고 물어올 때 PG 콘솔에 들어가서 찾아야 하는 구조는 비효율적이다.

HTTP 인터셉터를 공통으로 붙였다.

```typescript
@Injectable()
export class PgApiLoggingInterceptor implements HttpInterceptor {
  constructor(private readonly pgLogRepo: PgApiLogRepository) {}

  intercept(request: HttpRequest, next: HttpHandler): Observable<HttpEvent> {
    const startTime = Date.now();

    return next.handle(request).pipe(
      tap({
        next: (response) => {
          this.pgLogRepo.save({
            url: request.url,
            method: request.method,
            requestBody: request.body,
            responseBody: response.body,
            statusCode: response.status,
            durationMs: Date.now() - startTime,
            createdAt: new Date(),
          });
        },
        error: (error) => {
          this.pgLogRepo.save({
            url: request.url,
            method: request.method,
            requestBody: request.body,
            responseBody: error.response?.data,
            statusCode: error.response?.status,
            durationMs: Date.now() - startTime,
            isError: true,
            createdAt: new Date(),
          });
        },
      }),
    );
  }
}
```

이 인터셉터는 `TossPaymentsAdapter`와 `InicisAdapter` 모두에 적용된다. PG사가 추가돼도 로깅 코드는 건드릴 필요가 없다.

결과적으로 CS팀은 PG 콘솔에 접속하지 않아도 된다. 어드민에서 고객 ID로 조회하면 어떤 요청을 보냈고 어떤 응답이 왔는지 바로 확인할 수 있다. 결제 실패 원인도 `responseBody`에 다 있다.

---

## 결론

추상화는 미래를 위한 투자가 아니다. "두 번째부터 공짜"를 만드는 것이다.

토스페이먼츠를 붙일 때 인터페이스를 설계하는 데 하루 더 썼다. 이니시스를 붙일 때 그 하루를 돌려받았다. 세 번째 PG사가 오면 또 돌려받는다.

추상화 없이 이니시스를 붙였다면 `PaymentService` 전체를 뜨어야 했다. 기존 토스 로직을 건드리면서 회귀 테스트도 다시 돌려야 했다. 그게 더 바봄 일이다.
