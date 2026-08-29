# 플레이어의 영역 선택(arm/overlay) 코드가 죽었다

폰트 추천을 "화면 캡쳐 → 캡쳐 이미지에서 영역 선택" 방식으로 바꾸면서
영상 위에서 드래그로 영역을 고르는 경로를 안 쓰게 됐다.

`components/player/player-context.tsx`의 `arm` / `disarm` / `emitSelection` /
`armed`와 `components/player/youtube-player.tsx`의 오버레이·`scrollIntoView`
블록은 이제 아무도 호출하지 않는다. 동작에는 영향 없지만(항상 `armed=false`),
공유 모듈에 죽은 코드로 남아 있다. `RegionSelection` 타입도 마찬가지.

정리하려면 player 모듈에서 해당 API와 오버레이를 제거하면 된다.
