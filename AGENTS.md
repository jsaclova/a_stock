# AGENTS.md

미국지수 적립식 투자(DCA) 대시보드 — Vite + React 18 + TS 프런트엔드, Supabase Edge Functions 백엔드.

## Commands

- 개발: `npm run dev` (Vite)
- 빌드: `npm run build` (`vite build`만 실행 — 타입체크 포함 안 됨)
- 린트: `npm run lint`
- 타입체크: `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`)
- 테스트: 프레임워크 없음. 검증은 `lint` + `typecheck` + `build`로 대체
- 패키지 매니저: npm (`package-lock.json`). pnpm/yarn lockfile 만들지 말 것

## 경계 / 툴체인 분리 (중요)

- `src/` — 프런트엔드. `tsconfig.app.json`/`eslint.config.js` 적용 대상
- `supabase/functions/` — **Deno** 런타임의 Edge Functions. 프런트 tsconfig(`include: ["src"]`)와 eslint 범위 **밖**. Node/브라우저 가정 코드 넣지 말 것
- 두 functions 모두 `verify_jwt = false` (`supabase/config.toml`) — 공개 엔드포인트

## 환경

- `.env` 필수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (gitignore 처리됨, 커밋 금지)
- 프런트는 이 env로 `${SUPABASE_URL}/functions/v1/*` 를 직접 fetch (`src/lib/api.ts`)

## Conventions

- 경로 alias: `@/` → `src/` (vite.config.ts + tsconfig.app.json paths 둘 다 정의됨 — 양쪽 수정 필요)
- UI 텍스트/에러 메시지 한국어, 금액은 KRW 기준
- `vite.config.ts`의 `optimizeDeps.exclude: ['lucide-react']`는 Bolt 템플릿 기본값 — 제거하지 말 것
