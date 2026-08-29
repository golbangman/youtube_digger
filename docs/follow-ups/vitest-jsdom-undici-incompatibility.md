# vitest 실행 시 jsdom/undici 초기화 오류

## 증상

`bun run test` 실행 시 테스트가 하나도 실행되지 않고 즉시 실패한다.

```
TypeError: webidl.util.markAsUncloneable is not a function
  at new CacheStorage node_modules/undici/lib/web/cache/cachestorage.js:20:17
  at node_modules/jsdom/lib/api.js:12:33
```

## 재현

`git stash`로 이번 작업(caption-download-translate) 변경을 모두 치운 원본 상태에서도 동일하게 재현된다. 저장소의 기존 의존성 조합 문제이고 이번 작업과 무관하다. 2026-08-29 확인.

## 의심 원인

`jsdom@30`이 내부적으로 쓰는 `undici`가 현재 Node.js 런타임(v20.20.2)의 `webidl` 구현과 맞지 않는 것으로 보인다. `jsdom`·`undici`·Node.js 버전 중 하나를 조정하면 해결될 가능성이 있다. 동일 템플릿 기반의 `youtube_caption.git`에도 같은 follow-up이 있다.

## 시도한 것

- `git stash`로 원본 상태 재현만 확인(이번 작업 원인 아님).
- 이번 작업의 런타임 검증은 Playwright E2E와 `next dev` 브라우저 확인으로 대체함.

## 제안하는 다음 단계

`jsdom`/`undici` 버전 조합을 실행 환경에 맞춰 조정하거나 Node.js 버전을 올려 재현 여부 확인.
