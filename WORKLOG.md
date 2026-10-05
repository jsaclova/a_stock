# a_stock 작업일지

> 다음 세션 시작 시 이 파일부터 읽을 것. 최신 상태: `main` @ `3cd018b` 이후.
> 최종 업데이트: 2026-10-06 (이 파일 커밋 포함)

## 프로젝트 개요

- 미국지수 적립식 투자(DCA) 대시보드. Vite + React 18 + TS + Tailwind.
- 백엔드: Supabase Edge Functions(Deno) 7종 (`supabase/functions/`) + Vercel 포팅 (`api/`).
- 상세 스택·명령어는 `AGENTS.md`, 배포手順은 `DEPLOY.md` 참고.

## 배포 지점 (3곳, 전부 동일 커밋 기준 유지할 것)

| 지점 | 주소 | 방식 | 비고 |
|---|---|---|---|
| 로컬(Mac) | http://192.168.55.156:8090 (또는 http://localhost:8090) | `docker compose up -d --build` | 이 맥에서 직접 관리. Mac IP: `.156`(en0), `.246`(en1) |
| CasaOS(홈서버) | http://192.168.55.216:8090 | SSH 후 `git pull` + compose | **주의**: `git pull` 후 함수 컨테이너 `restart` 필수 (아래 이슈 참고) |
| Vercel | https://a-stock-ten.vercel.app/ | GitHub push → 자동배포 | 한 번 미트리거 사례 있음. 안 뜨면 대시보드 Deployments 확인 |

## 이번 세션 작업 내역 (전부 `3cd018b`에 커밋·푸시됨)

1. **3대 지수 finviz식 개편** (`src/components/IndexChart.tsx` 신규, `IndexTicker.tsx`)
   - 일: 당일 15분봉 캔들 + 거래량 + 전일종가 점선 + 노란 현재가 태그 + 가격/시간축
   - 월/년: 추세선 + 축 + 현재가 태그. 갱신주기 일 60초 / 월·년 24시간
   - 백엔드(`stock-data` 양쪽): 장중 interval(1m~1h) 요청 시 OHLC 캔들·전일종가·실시간가 추가 반환
2. **변화율 일일 기준 통일**
   - `ticker` 양쪽: `chartPreviousClose`(1개월 조회 시 한 달 전 값) 대신 직전 일봉 종가 사용
   - `market-quotes` 양쪽: `1y/1wk` → `3mo/1d`, 직전 일봉 종가 기준 (국채는 Treasury 전 영업일 기준 그대로)
   - 월 보기: 월봉 끝 당월 미완성 봉을 건너뛰고 **전월 확정종가** 대비로 계산
3. **티커 검색**: 일일 등락률 + "· 전일 대비" 표기, 당일 캔들(compact) 표시, X 닫기 버튼, 헤더 한 줄 고정
4. **헤더**: 검색·조회·로그인 한 줄, 로그인 아이콘만 (`title`/`aria-label` 유지)
5. **환율 스트립**(`FxRatesStrip`): 마운트 1회 → 60초 자동 새로고침
6. **뉴스 패널**: 왼쪽 컬럼(자산성장추이 끝) 높이 실측(`ResizeObserver`) → `maxHeight` 고정 + 내부 스크롤. 모바일은 제한 없음
7. **상위 100→50종목**: `TOP100`→`TOP50` (51위 QCOM 이하 삭제, 양쪽 함수), 탭·제목·README·DEPLOY 라벨 변경
8. **포트폴리오**: 표 8컬럼 (매수일·종목·매수가·수량·매수금액·현재가·평가금액·수익률), 행별 손익 색상(현재가·평가금액·현재 평가액 포함), CSV 화면 동일(최신순·한글 헤더·BOM)
9. **모바일 대응**: 탭바 가로 스크롤, 테이블 `min-w` + 가로 스크롤, 카드 패딩·숫자 `sm:` 반응형, MarketQuotes 스파크 480px 미만 숨김
10. **nginx**: `index.html` no-cache + `/assets` immutable (구 번들 캐시 재발 방지)

## 운영 이슈 및 교훈

- **Deno 함수 재시작 필수**: `docker compose up -d --build`는 web만 리빌드하고 함수 컨테이너를 재시작하지 않음.
  코드 pull 후 반드시 `docker compose restart stock-data market-quotes top-stocks ticker fx-krw market-news portfolio`
  (증상 사례: `.216`에서 market-news 자리에 portfolio 응답 등 엔드포인트 매핑 꼬임처럼 보임 → 전부 구 컨테이너 문제였고, 싹 밀고 `down` 후 재생성으로 해결)
- **폰 캐시**: 사파리가 구 `index.html` 고수 → nginx no-cache로 해결. 그래도 안 되면 설정에서 웹 데이터 삭제
- **Yahoo 주의**: `range=1y&interval=1mo` 응답 끝에 당월 미완성 봉이 붙음. 월기준 계산 시 같은 연월 봉 건너뛰기
- `chartPreviousClose`는 조회 범위 시작점 기준이라 일일 변화율에 쓰면 안 됨. 항상 직전 일봉 종가 사용
- 검증은 매 변경마다 `npm run lint` + `npm run typecheck` + `npm run build` (테스트 프레임워크 없음)
- lint 경고 5건(`react-refresh/only-export-components`, `IndexChart.tsx`)은 안내성, 무시 가능

## 검증된 실측값 (2026-10-05/06 기준, 동작 확인용)

- `stock-data` 일봉: `^GSPC` 캔들 반환, `latestPrice=regularMarketPrice`
- `ticker` AAPL: 일일 +0.25%대 (월간 +4.5% 아님)
- `market-quotes`: WTI -1.17%, 금 -0.11% 등 일일 스케일
- `top-stocks`: 50행 (1위 NVDA ~ 50위 SPGI)
- `fx-krw`: 달러 1,341원대

## 다음 세션 시작 체크리스트

1. `git status` / `git log --oneline -3` (예상: 클린, `3cd018b` + 이 파일 커밋)
2. `docker compose ps` (11개 Up인지)
3. 3곳(로컬·`.216`·Vercel) 번들에 신코드 마커 있는지 샘플 확인
