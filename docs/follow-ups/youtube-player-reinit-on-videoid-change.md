# YouTubePlayer가 videoId 변경 시 다시 초기화되지 않는다

## 증상

`components/player/youtube-player.tsx`에서 YouTube IFrame API는 첫 마운트 때
`hostRef.current` div를 iframe으로 교체한다. 이후 그 ref는 분리된 노드를 가리킨다.
`videoId`가 바뀌어 effect가 다시 돌면 `new YT.Player(hostRef.current, ...)`가
분리된 div 위에서 만들어져 아무것도 렌더되지 않는다.

## 범위 판단

이 앱에서 `YouTubePlayer`의 `videoId`는 라우트 파라미터(`/videos/[id]`)에서 오고,
다른 영상으로 가면 페이지 전체가 다시 마운트된다. 즉 마운트된 채로 `videoId`가
바뀌는 경로가 없다. StrictMode 이중 실행은 `cancelled` 플래그와 모듈 레벨
`apiPromise` 캐시로 처리되며, 수동 프로브와 단독 e2e에서 정상 초기화를 확인했다.

## 다음 단계

`videoId`가 바뀔 수 있게 되면(예: 같은 페이지에서 플레이어만 교체), host div
안에 YT가 교체할 자식 요소를 따로 두고 effect마다 새로 만들어 붙이거나,
`<YouTubePlayer key={videoId} />`로 강제 리마운트한다.
