---
title: "지점 마스터 시스템: 6개 공급사 데이터 파편화 해결기"
description: "같은 인천공항인데 공급사마다 이름이 다 달랐다. 마스터 테이블 구축과 OpenAI Batch API로 검색 품질을 끌어올린 과정."
tags: ["NestJS", "MySQL", "OpenAI", "데이터정규화", "렌터카"]
---

# 지점 마스터 시스템: 6개 공급사 데이터 파편화 해결기

## 데이터를 까봤더니

공급사 6곳에서 받아온 인천공항 지점 데이터다.

| 공급사 | 지점 명칭 |
|--------|-----------|
| Supplier A | `Incheon Airport T1` |
| Supplier B | `ICN Int'l Airport` |
| Supplier C | `仁川国際空港` |
| Supplier D | `Seoul Incheon Intl` |
| Supplier E | `인천국제공항 제1터미널` |
| Supplier F | `ICN - Incheon International Airport` |

전부 같은 곳이다. 그런데 시스템은 이걸 6개의 다른 지점으로 인식하고 있었다.

사용자가 검색창에 "인천공항"을 입력하면 Supplier E 결과만 나왔다. 나머지 5개 공급사의 재고는 검색 결과에서 아예 빠졌다. 가격 비교도 당연히 불가능했다. 71개국 400만 대 인벤토리를 갖고 있는데, 검색 한 번에 5/6이 날아가는 구조였다.

이게 인천공항만의 문제가 아니었다. 파리 샤를드골, 도쿄 나리타, 두바이 공항 전부 마찬가지였다. 공급사마다 명칭 규칙이 달랐고, 일부는 IATA 코드를 쓰고, 일부는 현지어를 쓰고, 일부는 터미널 번호를 붙이고 안 붙이고가 제각각이었다.

---

## 문제의 구조

기존에는 공급사에서 받아온 지점 데이터를 그대로 DB에 넣고, 검색 시 문자열 매칭으로 찾는 방식이었다.

```sql
-- 기존 테이블 구조 (단순 저장)
CREATE TABLE supplier_locations (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(20) NOT NULL,
  location_id VARCHAR(100) NOT NULL,  -- 공급사 자체 ID
  name        VARCHAR(255) NOT NULL,  -- 공급사가 준 이름 그대로
  country     VARCHAR(10),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

검색 쿼리는 대략 이런 식이었다.

```sql
SELECT * FROM supplier_locations
WHERE name LIKE '%incheon%'
   OR name LIKE '%ICN%';
```

LIKE 검색이라 느리고, 한국어로 검색하면 영문 데이터는 안 잡히고, 공급사별 결과를 묶을 방법도 없었다. 신규 공급사가 붙을 때마다 검색 로직에 예외 처리를 추가하는 방식으로 버텨왔다.

---

## 설계: 마스터 테이블 + 매핑 테이블

"진짜 지점"을 정의하는 마스터 테이블을 하나 두고, 공급사별 명칭은 전부 매핑 테이블로 연결한다.

```sql
-- 마스터 지점 테이블
CREATE TABLE master_locations (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  name_ko      VARCHAR(255) NOT NULL,   -- 한국어 표준 명칭
  name_en      VARCHAR(255) NOT NULL,   -- 영어 표준 명칭
  iata_code    VARCHAR(10),             -- 공항 IATA 코드 (해당 시)
  country_code CHAR(2) NOT NULL,
  city         VARCHAR(100),
  location_type ENUM('airport', 'city', 'station', 'hotel') NOT NULL,
  latitude     DECIMAL(10, 7),
  longitude    DECIMAL(10, 7),
  is_active    TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- 공급사별 매핑 테이블
CREATE TABLE supplier_location_mappings (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  master_location_id  BIGINT NOT NULL,
  supplier_id         VARCHAR(20) NOT NULL,
  supplier_location_id VARCHAR(100) NOT NULL,  -- 공급사 자체 ID
  supplier_name       VARCHAR(255) NOT NULL,   -- 공급사가 준 원본 명칭
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (master_location_id) REFERENCES master_locations(id),
  UNIQUE KEY uq_supplier_location (supplier_id, supplier_location_id)
);
```

인천공항 데이터는 이렇게 바뀐다.

```sql
-- master_locations
INSERT INTO master_locations (name_ko, name_en, iata_code, country_code, city, location_type)
VALUES ('인천국제공항', 'Incheon International Airport', 'ICN', 'KR', 'Incheon', 'airport');
-- id = 1001

-- supplier_location_mappings
INSERT INTO supplier_location_mappings (master_location_id, supplier_id, supplier_location_id, supplier_name)
VALUES
  (1001, 'supplier_a', 'ICN_T1', 'Incheon Airport T1'),
  (1001, 'supplier_b', 'ICN001', 'ICN Int''l Airport'),
  (1001, 'supplier_c', 'TYO-ICN', '仁川国際空港'),
  (1001, 'supplier_d', 'SEL-ICN', 'Seoul Incheon Intl'),
  (1001, 'supplier_e', 'KR-ICN-01', '인천국제공항 제1터미널'),
  (1001, 'supplier_f', 'ICNAP', 'ICN - Incheon International Airport');
```

검색 쿼리가 이렇게 바뀐다.

```sql
-- "인천공항" 검색 시
SELECT ml.id, ml.name_ko, ml.name_en, slm.supplier_id, slm.supplier_location_id
FROM master_locations ml
JOIN supplier_location_mappings slm ON ml.id = slm.master_location_id
WHERE ml.name_ko LIKE '%인천%'
   OR ml.name_en LIKE '%incheon%'
   OR ml.iata_code = 'ICN';
```

한 번의 쿼리로 6개 공급사 결과가 전부 나온다. 신규 공급사가 붙으면 매핑 테이블에 행만 추가하면 된다. 검색 로직은 건드릴 필요가 없다.

---

## 번역 처리: 실시간 API 호출의 문제

마스터 테이블을 구축하려면 다국어 명칭이 필요했다. 공급사에서 받아온 데이터는 영어, 일본어, 중국어, 아랍어가 섞여 있었다. 전부 한국어와 영어 표준 명칭으로 정규화해야 했다.

처음엔 OpenAI API를 실시간으로 호출하는 방식을 검토했다. 지점 데이터가 들어올 때마다 번역 요청을 날리는 구조다. 계산해봤더니 문제가 있었다.

- 전체 지점 수: 약 8만 건
- 공급사별 평균 지점 수: 1.3만 건
- 실시간 API 단가: gpt-4o-mini 기준 input $0.15/1M tokens
- 지점명 평균 토큰: 약 20 tokens
- 총 예상 비용: 8만 건 × 20 tokens = 160만 tokens → 약 $0.24 (초기 구축)

초기 구축 비용은 크지 않았다. 문제는 운영 중 발생하는 비용이었다. 공급사들은 주기적으로 지점 데이터를 업데이트한다. 신규 지점 추가, 명칭 변경, 터미널 분리 등이 수시로 생긴다. 실시간 호출 방식이면 이 업데이트마다 API를 때려야 했다.

더 큰 문제는 레이턴시였다. 공급사 데이터 동기화 배치가 돌 때 수천 건의 번역 요청이 동시에 발생하면, API 응답 대기 시간이 전체 배치 처리 시간을 늘렸다. rate limit에 걸리면 재시도 로직까지 필요했다.

OpenAI Batch API를 쓰면 이 문제가 해결된다. 요청을 파일로 묶어서 한 번에 제출하고, 비동기로 처리 결과를 받아온다. 단가도 실시간 API의 절반이다.

---

## OpenAI Batch API 처리 흐름

```typescript
// batch-translation.service.ts

@Injectable()
export class BatchTranslationService {
  constructor(
    private readonly openai: OpenAI,
    private readonly locationRepo: LocationRepository,
  ) {}

  async createTranslationBatch(locations: RawLocation[]): Promise<string> {
    // 1. JSONL 형식으로 요청 파일 생성
    const requests = locations.map((loc, idx) => ({
      custom_id: `loc-${loc.supplierId}-${loc.locationId}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '지점 명칭을 한국어와 영어 표준 명칭으로 변환해라. JSON 형식으로만 응답해라: {"name_ko": "...", "name_en": "..."}',
          },
          {
            role: 'user',
            content: `원본 명칭: ${loc.name}\n국가: ${loc.country}\n지점 유형: ${loc.type}`,
          },
        ],
        max_tokens: 100,
      },
    }));

    const jsonl = requests.map(r => JSON.stringify(r)).join('\n');

    // 2. 파일 업로드
    const file = await this.openai.files.create({
      file: new File([jsonl], 'batch_input.jsonl', { type: 'application/jsonl' }),
      purpose: 'batch',
    });

    // 3. 배치 작업 생성
    const batch = await this.openai.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    });

    return batch.id;
  }

  async pollBatchResult(batchId: string): Promise<TranslationResult[]> {
    // 4. 완료 대기 (폴링)
    let batch = await this.openai.batches.retrieve(batchId);

    while (batch.status !== 'completed' && batch.status !== 'failed') {
      await sleep(30_000); // 30초 간격 폴링
      batch = await this.openai.batches.retrieve(batchId);
    }

    if (batch.status === 'failed') {
      throw new Error(`Batch ${batchId} failed`);
    }

    // 5. 결과 파일 다운로드 및 파싱
    const outputFile = await this.openai.files.content(batch.output_file_id);
    const lines = (await outputFile.text()).split('\n').filter(Boolean);

    return lines.map(line => {
      const result = JSON.parse(line);
      const content = result.response.body.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        customId: result.custom_id,
        nameKo: parsed.name_ko,
        nameEn: parsed.name_en,
      };
    });
  }
}
```

배치 처리 흐름은 이렇다.

```
[공급사 데이터 수신]
       ↓
[신규/변경 지점 추출]
       ↓
[JSONL 파일 생성 → OpenAI 업로드]
       ↓
[배치 작업 제출 → batch_id 저장]
       ↓
[30초 간격 폴링 (최대 24시간)]
       ↓
[결과 파일 다운로드 → 파싱]
       ↓
[master_locations 업데이트]
```

실시간 처리가 아니라 비동기 처리다. 번역 결과가 나오기 전까지는 기존 매핑 데이터로 서비스하고, 번역이 완료되면 마스터 테이블을 업데이트한다. 사용자 입장에서는 지연이 없다.

---

## 신규 공급사 연동 구조

기존엔 공급사가 하나 추가될 때마다 검색 로직 전체를 손봐야 했다. 지금은 매핑 작업만 하면 된다.

```typescript
// supplier-mapping.service.ts

@Injectable()
export class SupplierMappingService {
  async mapSupplierLocations(
    supplierId: string,
    rawLocations: SupplierLocation[],
  ): Promise<void> {
    for (const raw of rawLocations) {
      // 1. IATA 코드로 마스터 지점 찾기
      let master = raw.iataCode
        ? await this.locationRepo.findByIata(raw.iataCode)
        : null;

      // 2. 없으면 좌표 기반 근접 검색 (반경 5km)
      if (!master && raw.latitude && raw.longitude) {
        master = await this.locationRepo.findNearby(
          raw.latitude,
          raw.longitude,
          5000,
        );
      }

      // 3. 그래도 없으면 신규 마스터 지점 생성 대기열에 추가
      if (!master) {
        await this.pendingQueue.add({ supplierId, raw });
        continue;
      }

      // 4. 매핑 테이블에 추가
      await this.mappingRepo.upsert({
        masterLocationId: master.id,
        supplierId,
        supplierLocationId: raw.locationId,
        supplierName: raw.name,
      });
    }
  }
}
```

신규 공급사 연동 시 개발자가 건드리는 건 이 매핑 로직뿐이다. 검색, 번역, 가격 비교 로직은 그대로다.

---

## 결과

배포 후 2주 데이터다.

**예약 수 변화 (타깃 지역 기준)**
- 도입 전: 일 평균 200건
- 도입 후: 일 평균 400건
- 증가율: 100%

검색 결과에서 빠지던 5개 공급사 재고가 노출되기 시작했고, 가격 비교가 가능해지면서 전환율이 올랐다. 특히 공항 픽업 수요가 높은 지역에서 효과가 컸다.

**번역 API 비용**
- 실시간 호출 방식 예상 비용: 월 $X
- Batch API 전환 후: 월 $X × 0.5
- 절감율: 50%

Batch API 단가가 실시간의 절반이고, 중복 번역 요청도 줄었다. 이미 번역된 지점은 캐시에서 꺼내 쓰기 때문에 API 호출 자체가 줄었다.

---

## 한계와 남은 문제

완벽하지 않다.

**매핑 정확도 문제.** IATA 코드가 없는 도심 지점은 좌표 기반으로 매핑하는데, 반경 5km 안에 지점이 여러 개면 틀린 곳에 매핑될 수 있다. 현재는 이런 케이스를 수동 검수 큐에 넣고 있다. 전체 지점의 약 8%가 수동 검수 대상이다.

**번역 품질 편차.** gpt-4o-mini가 아랍어, 태국어 지점명을 한국어로 옮길 때 가끔 어색한 표현이 나온다. 특히 도시 이름이 아닌 건물명, 호텔명 번역에서 오류가 생긴다. 번역 결과에 신뢰도 점수를 붙이고 낮은 것만 재검토하는 방식을 검토 중이다.

**배치 처리 지연.** 신규 지점이 번역 완료되기까지 최대 24시간이 걸린다. 공급사가 긴급하게 지점을 추가하는 경우 실시간 API로 폴백하는 로직이 필요한데, 아직 구현 안 됐다.

**공급사 데이터 품질.** 일부 공급사는 같은 지점을 여러 ID로 보내거나, 좌표 데이터가 아예 없는 경우가 있다. 데이터 품질이 나쁜 공급사일수록 매핑 오류율이 높다. 공급사 측에 데이터 품질 개선을 요청했지만 진행이 느리다.

구조 자체는 맞는 방향이라고 생각한다. 다만 매핑 정확도를 높이는 작업이 아직 남아 있다.
