# 배경음악 추출의 오류 처리 엣지 두 가지

`code-review low`에서 나온 지적 중, 정상 경로를 깨지 않아 이번 작업에서 고치지
않고 남긴 항목이다. AGENTS.md의 검증·리뷰 예산상 스펙이 요구하지 않은 엣지케이스
방어는 범위 밖이다.

## 1. ffmpeg 미설치 판정이 stderr 메시지 형태에 의존한다

`lib/audio.ts`의 `close` 핸들러는 `stderrTail`(마지막 2000바이트)에
`ffmpeg|ffprobe`와 `not found|not installed`가 함께 있을 때만
`ToolNotInstalledError`로 안내한다. yt-dlp 버전에 따라 문구가 다르거나 tail 밖으로
밀리면 "오디오 추출에 실패했습니다"라는 일반 메시지로 표시된다. 추출은 어차피
실패하므로 기능상 손해는 없고, 안내 문구만 덜 친절해진다.

- 다음 단계: 추출 시작 전에 `ffmpeg -version` 종료 코드로 설치 여부를 먼저 확인.

## 2. SSE 클라이언트가 JSON.parse를 try/catch 없이 한다

`components/audio-extract/audio-extract.tsx`의 `onmessage`가
`JSON.parse(event.data)`를 그대로 부른다. 현재 서버 라우트는 `data: {json}\n\n`
형식만 보내고 주석·keepalive·분할 프레임을 보내지 않으므로 파싱이 깨질 일은
없다. 하지만 나중에 서버가 keepalive 주석 등을 추가하면 파싱 예외가 나고 상태가
"추출 중"에 멈춘 채 에러 표시도 안 된다.

- 다음 단계: `onmessage`에서 `JSON.parse`를 try/catch로 감싸고, 실패 시 무시하거나
  에러 상태로 전환.
