# 라디오 플레이어

GitHub Pages에 올려서 사용할 수 있는 정적 웹 라디오 플레이어입니다.

## 기능

- 지역별 라디오 채널 목록 제공
- 재생 목록과 전체 채널 목록을 탭으로 전환
- 전체 채널 목록에서 체크/해제로 재생 목록 구성
- 전체 체크 / 전체 해제 지원
- 선택한 재생 목록을 브라우저에 저장해서 다음 접속 때 유지
- 재생 목록에서 원하는 채널을 눌러 바로 재생
- 이전 / 다음 버튼으로 재생 목록 안에서 채널 이동
- 브라우저와 기기의 미디어 컨트롤 이전/다음 동작 지원
- iPhone 잠금화면, 제어센터, 차량 블루투스 표시를 위한 Media Session 메타데이터 설정
- 데스크톱과 모바일 화면을 모두 고려한 반응형 레이아웃

## 라디오 스트리밍 주소

이 프로젝트는 라디오 채널 재생 주소로 [BSOD 라디오](https://radio.bsod.kr/)에서 제공하는 고정 스트리밍 URL 형식을 사용합니다.

예시:

```text
https://radio.bsod.kr/stream/?stn=sbs&ch=powerfm
```

지역 채널은 필요한 경우 `city` 값을 함께 붙여 사용합니다.

```text
https://radio.bsod.kr/stream/?stn=sbs&ch=powerfm&city=busan
```

채널 목록과 재생 URL은 `src/channels.js`와 `src/playerState.js`에서 관리합니다.

## GitHub Pages 배포

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. 저장소의 `Settings`로 이동합니다.
3. `Pages` 메뉴를 엽니다.
4. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
5. 배포할 브랜치와 root 디렉터리를 선택합니다.
6. 저장 후 GitHub Pages URL로 접속합니다.

이 프로젝트는 별도 빌드 과정이 필요 없습니다. `index.html`, `styles.css`, `src/` 파일이 그대로 배포됩니다.

## 로컬 실행

```bash
python3 -m http.server 8000
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:8000/
```

## 테스트

```bash
npm test
```

재생 URL 생성, 재생 목록 선택 상태, 이전/다음 채널 이동 같은 핵심 로직을 테스트합니다.

