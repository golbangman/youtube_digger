# 이미지 밖으로 드래그하면 크롭에 투명 픽셀이 섞여 weight가 부풀려진다

## 증상

`components/font-match/screenshot-cropper.tsx`의 `finishSelection`은 드래그 종료
좌표(`pointFromEvent`)를 이미지 경계로 클램프하지 않는다. `onMouseLeave`에도
걸려 있어 포인터가 이미지 밖으로 나간 채 끝나면 `sx/sy`가 음수, `sw/sh`가
`naturalWidth/naturalHeight`를 넘을 수 있다. `ctx.drawImage`의 소스 사각형 일부가
캔버스 밖이 되어 그 영역은 투명 검정(0,0,0,0)으로 남는다. `measureCrop`은 alpha를
무시하고 RGB만 보므로 그 픽셀을 순수 검정 획으로 취급해 `weight` 특징이
부풀려지고 랭킹이 두꺼운 폰트 쪽으로 치우친다. `matchfont.git`에서 그대로 이식한
코드다.

## 범위 판단

`docs/specs/font-recommendation/spec.md`가 유사도 랭킹 품질을 미룬 상태이고 런타임
검증을 "흐름 완주"로 한정한다. AGENTS.md의 검증·리뷰 예산상 스펙이 요구하지 않은
엣지케이스 방어는 범위 밖이다. 이미지 안에서 드래그하는 정상 경로에서는 문제
없다.

## 제안하는 다음 단계

- `finishSelection`에서 선택 사각형을 `[0, clientWidth] × [0, clientHeight]`로
  클램프한 뒤 스케일 변환.
- 또는 `sx/sy/sw/sh`를 `[0, naturalWidth/Height]` 범위로 잘라내기.
