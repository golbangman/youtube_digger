# width 특징이 실제 글자 수 대신 샘플 문구 길이를 쓴다

## 증상

`components/font-match/font-match.tsx`가 `measureCrop(region, previewText.length)`를
호출한다. "이미지 속 글자"를 비워 두면 `previewText`는 `SAMPLE_TEXT`("Handgloves",
10자)로 대체되고, `measureCrop`은 이 길이로 `perCharWidth = width / textLength`를
계산한다. 실제 크롭 속 글자 수가 10과 다르면 width 특징(콘덴스트 대 넓은 폭)이
엉뚱하게 잡힌다. `matchfont.git`에서 그대로 이식한 코드이며 같은 follow-up이 있다.

## 범위 판단

`docs/specs/font-recommendation/spec.md`가 유사도 랭킹 품질을 미룬 상태이고 런타임
검증을 "흐름 완주"로 한정한다. 편집자가 글자를 입력하는 정상 경로에서는 정확하므로
이번 작업 범위 밖으로 둔다.

## 제안하는 다음 단계

- 글자를 안 넣었을 때는 width 차원을 랭킹에서 빼거나 중립값(0.5)으로 두기.
- 또는 글자 입력을 추천의 필수 입력으로 만들기.
