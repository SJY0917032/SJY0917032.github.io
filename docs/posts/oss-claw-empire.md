---
title: AI 에이전트 오케스트레이터에 기여한 이야기
description: Claw-Empire 오픈소스에 토큰 절감과 자동 업데이트 기능을 기여한 후기
---

# AI 에이전트 오케스트레이터에 기여한 이야기

Claw-Empire라는 오픈소스 프로젝트에 두 건의 PR을 올렸다. Claude Code, Codex CLI, Gemini CLI 같은 AI 코딩 에이전트를 가상 회사처럼 오케스트레이션하는 TypeScript/Node.js 기반 프로젝트인데, 직접 써보면서 불편했던 점을 고쳐서 올린 거라 기록해둔다.

[GitHub: GreenSheep01201/claw-empire](https://github.com/GreenSheep01201/claw-empire) (★106)

---

## 미팅 프롬프트 토큰 절감 (#23)

### 문제

Claw-Empire에는 에이전트들이 미팅을 하는 기능이 있다. planned meeting이나 review meeting 턴이 반복되면서 프롬프트에 들어가는 Task context와 transcript가 계속 커지는데, 오래 돌릴수록 토큰 사용량이 증가하고 응답도 느려졌다. 실제로 미팅 세션이 길어지면 전체 task description과 과거 transcript 전부를 프롬프트에 실어 보내는 구조였다.

### 해결

세 가지를 손봤다.

**1) Task context compaction**

미팅 프롬프트에 들어가는 Task context에서 `[PROJECT MEMO]` 꼬리를 제거하고, bounded head/tail compaction을 적용했다. `MEETING_PROMPT_TASK_CONTEXT_MAX_CHARS` (기본 1200자)로 앞뒤만 잘라서 넣는 방식. 전체 task description이 수천 자여도 미팅에 필요한 핵심 맥락만 남긴다.

**2) Transcript compaction**

과거 발언을 전부 들고 다니지 않고 최근 N턴만 유지한다 (`MEETING_TRANSCRIPT_MAX_TURNS`, 기본 12턴). 각 발언도 `MEETING_TRANSCRIPT_LINE_MAX_CHARS` (기본 180자)로 요약하고, 같은 speaker가 같은 내용을 반복한 턴은 중복 제거. 총 transcript 예산(`MEETING_TRANSCRIPT_TOTAL_MAX_CHARS`, 기본 2400자)도 걸어둬서 프롬프트가 무한정 커지는 걸 방지했다.

**3) Continuation memo trim**

continuation brief에 포함되는 latest project memo excerpt 예산을 1400 → 900자로 줄이고, whitespace 정규화도 추가.

### 설계 포인트

환경변수로 모든 budget을 조절할 수 있게 했다. 프로젝트 성격에 따라 미팅 컨텍스트가 많이 필요할 수도 있고, 토큰을 아껴야 할 수도 있으니까. compaction 함수는 `meeting-prompt-utils.ts`로 분리하고 테스트도 붙였다.

Copilot 코드 리뷰를 여러 차례 받으면서 edge case (빈 transcript, 한 줄짜리 context 등)를 보완했다.

---

## 안전 자동 업데이트 시스템 (#26)

### 문제

기존에는 새 버전이 나오면 상단에 배너만 띄워주는 방식이었다. "업데이트가 있습니다" 알림은 뜨는데, 실제 업데이트는 사용자가 직접 `git pull && pnpm install`을 해야 했다. 로컬 퍼스트 앱이라 자동 업데이트를 잘못 걸면 작업 중인 코드가 날아갈 수 있는 구조였고, 그래서 아무도 자동 업데이트를 구현하지 않은 상태였다.

### 해결

핵심은 "안전하지 않으면 건너뛴다"는 원칙.

**Safety gates 설계**

자동 업데이트가 실행되기 전에 아래 조건을 전부 체크한다. 하나라도 걸리면 업데이트를 건너뛴다:

- 업데이트 가능한 버전이 없음
- 채널 정책에 의해 차단됨 (patch만 허용하는데 minor 업데이트인 경우)
- 현재 git branch가 `main`이 아님
- working tree가 dirty (커밋 안 된 변경이 있음)
- 서버가 바쁨 — `in_progress` 상태 task가 있거나 CLI 프로세스가 돌고 있을 때 (idle-only 모드)

**환경변수 기반 opt-in**

기본값은 전부 꺼져 있다. 켜려면 명시적으로 환경변수를 설정해야 한다:

```
AUTO_UPDATE_ENABLED=1
AUTO_UPDATE_CHANNEL=patch   # patch | minor | all
AUTO_UPDATE_IDLE_ONLY=1     # 바쁠 때는 건너뜀
AUTO_UPDATE_RESTART_MODE=notify  # notify | exit | command
```

**Manual apply API**

자동이 불안하면 수동으로도 할 수 있다. `POST /api/update-apply`에 `dry_run`과 `force` 옵션을 넣었다. dry run으로 먼저 확인하고, 괜찮으면 실제 적용. 파이프라인은 `git fetch` → `git pull --ff-only origin main` → `pnpm install --frozen-lockfile` 순서.

**Status API**

`GET /api/update-auto-status`로 현재 auto-update 설정, 런타임 상태, 마지막 업데이트 결과를 조회할 수 있다.

### 코드 구조

auto-update 로직은 `update-auto-utils.ts`로 분리하고, 커맨드 실행은 `update-auto-command.ts`로 분리. 유틸 함수에 대한 테스트도 작성했다. README.md와 README_ko.md 문서도 업데이트.

이 PR은 메인테이너가 머지해줬고, 이후 v1.1.4 릴리즈에 Settings UI에서 Auto Update 토글까지 추가됐다.

---

## 기여하면서 느낀 점

**코드 리뷰가 빨리 돈다.** Copilot이 자동으로 리뷰를 달아주는 구조라 PR 올리면 바로 피드백이 온다. 덕분에 force push → re-review 사이클이 빠르게 돌았고, edge case를 많이 잡을 수 있었다.

**안전 장치 설계가 중요하다.** 자동 업데이트 같은 위험한 기능은 "기본 off + opt-in"이 맞다. dirty tree 체크, branch 체크, idle 체크 같은 safety gate를 여러 겹으로 쌓는 게 실사용에서 신뢰를 준다.

**환경변수로 budget을 열어두는 게 오픈소스에선 중요하다.** 내가 정한 기본값이 모든 사용자에게 맞을 리가 없다. 토큰 budget이든 업데이트 채널이든, 설정 가능하게 열어두고 합리적인 기본값을 고르는 게 핵심.

---

**PR 링크**

- [#23 — feat(workflow): compact meeting prompts to reduce token usage](https://github.com/GreenSheep01201/claw-empire/pull/23)
- [#26 — feat(update): safe-mode auto-update loop + update-apply API](https://github.com/GreenSheep01201/claw-empire/pull/26)
