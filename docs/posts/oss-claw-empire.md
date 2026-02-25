---
title: AI 에이전트 오케스트레이터에 기여한 이야기
description: Claw-Empire 오픈소스에 토큰 절감과 자동 업데이트 기능을 기여한 후기
---

# AI 에이전트 오케스트레이터에 기여한 이야기

[GitHub: GreenSheep01201/claw-empire](https://github.com/GreenSheep01201/claw-empire) (★110)

Claw-Empire를 쓰다가 두 가지가 좀 불편했다. 미팅이 길어질수록 토큰이 폭발하는 것, 그리고 업데이트가 있어도 직접 `git pull`을 해야 하는 것. 그냥 쓰다가 "이거 내가 고쳐도 되겠는데?" 싶어서 PR을 올렸다.

## 미팅 프롬프트 토큰 절감 (#23)

Claw-Empire에는 에이전트들이 미팅을 하는 기능이 있다. planned meeting, review meeting 같은 턴이 반복되는 구조인데, 오래 돌리다 보면 프롬프트에 task description 전체랑 과거 transcript가 통째로 들어가서 점점 무거워진다. 실제로 미팅 세션이 길어지면 응답도 눈에 띄게 느려졌다.

세 군데를 손봤다.

**Task context compaction.** 미팅 프롬프트에 들어가는 task context에서 `[PROJECT MEMO]` 꼬리를 제거하고, 앞뒤만 잘라서 넣는 bounded head/tail compaction을 적용했다. `MEETING_PROMPT_TASK_CONTEXT_MAX_CHARS` 환경변수로 예산을 조절할 수 있고 기본값은 1200자. 전체 task description이 수천 자여도 미팅에 필요한 핵심 맥락만 남긴다.

**Transcript compaction.** 과거 발언을 전부 들고 다니지 않고 최근 N턴만 유지한다. `MEETING_TRANSCRIPT_MAX_TURNS` (기본 12턴), 각 발언은 `MEETING_TRANSCRIPT_LINE_MAX_CHARS` (기본 180자)로 자르고, 같은 speaker가 같은 내용을 반복한 턴은 중복 제거. 총 transcript 예산 `MEETING_TRANSCRIPT_TOTAL_MAX_CHARS` (기본 2400자)도 걸어서 프롬프트가 무한정 커지는 걸 막았다.

**Continuation memo trim.** continuation brief에 들어가는 latest project memo excerpt 예산을 1400 → 900자로 줄이고, whitespace 정규화도 추가.

compaction 함수는 `meeting-prompt-utils.ts`로 분리하고 테스트도 붙였다. 환경변수로 모든 budget을 조절할 수 있게 한 건 의도적인 설계다. 프로젝트 성격에 따라 컨텍스트가 많이 필요할 수도 있고, 토큰을 아껴야 할 수도 있으니까.

PR 올리고 나서 Copilot 자동 리뷰가 바로 달렸다. 빈 transcript 케이스, 한 줄짜리 context 케이스 같은 edge case를 여러 개 지적받았다. force push하고 re-review 받고, 또 force push하고... 이 사이클을 몇 번 돌았는데 생각보다 빠르게 돌아서 나쁘지 않았다.

---

## 안전 자동 업데이트 시스템 (#26)

기존에는 새 버전이 나오면 상단에 배너만 띄워줬다. "업데이트가 있습니다" 알림은 뜨는데, 실제 업데이트는 사용자가 직접 `git pull && pnpm install`을 해야 했다. 로컬 퍼스트 앱이라 자동 업데이트를 잘못 걸면 작업 중인 코드가 날아갈 수 있어서, 아무도 손을 안 댄 상태였다.

핵심 원칙은 하나였다. "안전하지 않으면 건너뛴다."

**Safety gates.** 자동 업데이트 실행 전에 아래 조건을 전부 체크한다. 하나라도 걸리면 그냥 건너뛴다:

- 업데이트 가능한 버전이 없음
- 채널 정책에 의해 차단됨 (patch만 허용하는데 minor 업데이트인 경우)
- 현재 git branch가 `main`이 아님
- working tree가 dirty (커밋 안 된 변경이 있음)
- 서버가 바쁨 — `in_progress` 상태 task가 있거나 CLI 프로세스가 돌고 있을 때 (idle-only 모드)

**환경변수 기반 opt-in.** 기본값은 전부 꺼져 있다. 켜려면 명시적으로 설정해야 한다:

```
AUTO_UPDATE_ENABLED=1
AUTO_UPDATE_CHANNEL=patch   # patch | minor | all
AUTO_UPDATE_IDLE_ONLY=1     # 바쁠 때는 건너뜀
AUTO_UPDATE_RESTART_MODE=notify  # notify | exit | command
```

**Manual apply API.** 자동이 불안하면 수동으로도 할 수 있다. `POST /api/update-apply`에 `dry_run`과 `force` 옵션을 넣었다. dry run으로 먼저 확인하고, 괜찮으면 실제 적용. 파이프라인은 `git fetch` → `git pull --ff-only origin main` → `pnpm install --frozen-lockfile` 순서.

**Status API.** `GET /api/update-auto-status`로 현재 auto-update 설정, 런타임 상태, 마지막 업데이트 결과를 조회할 수 있다.

auto-update 로직은 `update-auto-utils.ts`, 커맨드 실행은 `update-auto-command.ts`로 분리하고 테스트도 작성했다. README.md랑 README_ko.md도 업데이트.

이 PR은 메인테이너가 머지해줬고, 이후 v1.1.4 릴리즈에서 Settings UI에 Auto Update 토글까지 추가됐다. 내가 만든 기능이 UI로 올라오는 걸 보니 좀 뿌듯했다.

---

## 해보고 나서

Copilot 자동 리뷰가 생각보다 쓸만했다. PR 올리면 바로 피드백이 오고, force push → re-review 사이클이 빠르게 돌아서 edge case를 꽤 많이 잡았다. 사람 리뷰어 기다리는 것보다 훨씬 빠른 피드백 루프였다.

자동 업데이트 같은 기능은 "기본 off + opt-in"이 맞다는 걸 다시 확인했다. dirty tree 체크, branch 체크, idle 체크를 여러 겹으로 쌓는 게 귀찮아 보여도, 실사용에서 신뢰를 주는 건 결국 그런 것들이다.

오픈소스 기여가 거창한 게 아니었다. 쓰다가 불편한 거 고치고, PR 올리고, 리뷰 받고, 머지되면 끝. 그게 다였다.

**PR 링크**

- [#23 — feat(workflow): compact meeting prompts to reduce token usage](https://github.com/GreenSheep01201/claw-empire/pull/23)
- [#26 — feat(update): safe-mode auto-update loop + update-apply API](https://github.com/GreenSheep01201/claw-empire/pull/26)
