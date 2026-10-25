# 미국지수 적립식 투자 (US Index)

Vite + React 18 + TypeScript 프론트엔드, Deno Edge Functions 백엔드의 미국 지수·ETF 대시보드.
QQQ · SPY 분할 매수 시뮬레이션부터 실시간 시세, 자동매매 포트폴리오까지 제공합니다.

## 기능

| 탭 | 내용 |
|---|---|
| 적립식 시뮬레이션 | 월 투자금액(USD) · 조회 기간(3/5/10년) 설정, 종목별 수익률·자산 성장 차트, 미국 증시 뉴스(한글 번역) |
| 포트폴리오 | 지수ETF 탭에서 정한 규칙대로 매수했을 때의 실시간 수익률 (매수 내역 테이블, CSV 다운로드) |
| 시장 정보 | 미국 국채 금리(2/10/20/30년물) · 석유 · 원자재 · 통화, 1년치 차트, 60초 자동 새로고침 |
| 지수ETF | QQQ·SPY 계열 ETF (일반/레버리지·인버스, 운용사·보수·운용규모·실시간 가격), **지수 주간 자동매매 선택** |
| 상위 50종목 | 시총 순 일별 주가 (시가·종가·등락·거래량), Yahoo 링크 연결 |
| 가상하락 시나리오 | 하락폭 슬라이더(-10~-50%), 시나리오 시뮬레이션 차트, 계속 적립 시 5년·10년 후 예측 수익률 |

공통: 미국 3대 지수 카드(일/월/년), 원화 환율 스트립(달러·유로·파운드·엔·위안), 티커 검색.

### 지수 주간 자동매매 선택

지수ETF 탭에서 ETF·주기(주간/월간)·요일(월~금)/일자(1~31일)·수량을 정하고 **변경**을 누르면 포트폴리오 탭에 반영됩니다.
브라우저 로컬에 저장됩니다 (DB/로그인 없음). 기본값: 매주 금요일 SPYM 2주.

## 명령어

```bash
npm run dev        # 개발 서버 (Vite)
npm run build      # 프로덕션 빌드 (dist/)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit -p tsconfig.app.json
```

- 패키지 매니저: npm (`package-lock.json`)
- 테스트 프레임워크 없음. 검증은 `lint` + `typecheck` + `build`

## 구조

```
src/                 # 프론트엔드 (Vite + React + TS)
supabase/functions/  # Edge Functions (Deno 런타임): stock-data, market-news,
                     # market-quotes, top-stocks, fx-krw, ticker, portfolio
api/                 # 위 함수들의 Vercel Edge Runtime 포팅 (코드 동일, import 없음)
```

- `src/`와 `supabase/functions/`는 툴체인 분리 (프런트 tsconfig/eslint 범위 밖이 Deno 영역)
- Edge Functions는 모두 `verify_jwt = false` (공개 엔드포인트, 인증 검사는 안 함)
- 경로 alias: `@/` → `src/`
- UI 텍스트 한국어, 투자금액 USD 기준

## 환경 변수

시장 데이터는 같은 origin(`/functions/v1/*` → CasaOS 프록시·Vercel `/api`)에서 가져오므로 별도 API 주소 설정이 필요 없습니다.
자동매매 설정은 브라우저 로컬 저장이라 환경 변수가 필요 없습니다.

로컬 개발: `.env.local`이 `.env`보다 우선 적용됩니다 (gitignore 처리, 커밋 금지).

## 배포

자세한 순서는 [DEPLOY.md](./DEPLOY.md) 참고.

- **CasaOS**: `docker compose up -d --build` (프런트 nginx 1 + Deno 함수 7).
- **Vercel**: `api/` + `vercel.json`(`Rewrite /functions/v1/* → /api/*`)으로 프론트·API 함께 배포. 환경 변수 설정 불필요.
