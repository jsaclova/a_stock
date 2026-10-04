# 배포 가이드

구성: 프런트(Vite) + API 7종. CasaOS는 Docker로 통째로, Vercel은 `api/` Edge Functions로 함께 배포됩니다.

## Vercel 배포 (프론트 + API 함께)

`api/` 폴더에 Edge Functions 7종을 포팅해 두었으므로, Vercel에 올리면 프론트와 API가 함께 배포됩니다.
`vercel.json`이 `/functions/v1/*` → `/api/*` 로 연결해 별도 API 주소 설정이 필요 없습니다.

1. Git 저장소 준비 (Vercel은 git repo가 필요합니다):
   ```bash
   cd a_stock
   git init && git add . && git commit -m "init"
   gh repo create a-stock --private --source=. --push
   ```
2. https://vercel.com/ → Add New → Project → 저장소 선택
   - Framework: Vite (자동), Build Command: `npm run build`, Output: `dist` (자동)
3. Environment Variables: **추가하지 마세요.**
   `VITE_SUPABASE_URL`이 비어 있으면 같은 origin의 `/api`를 호출하고,
   `VITE_SUPABASE_ANON_KEY`가 비어 있으면 로그인 없이 전체 기능(자동매매는 브라우저 저장)이 동작합니다.
4. Deploy → `https://<프로젝트>.vercel.app` 접속

참고:
- 로그인(계정별 자동매매)이 필요하면 Supabase Cloud 프로젝트의 URL·anon key를
  `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`에 설정하세요.
  단, `supabase/migrations/20261005000000_auto_trade_settings.sql` +
  `20261006000000_auto_trade_schedule.sql`을 Cloud SQL Editor에서 실행하고,
  Auth → Providers → Email에서 Confirm email을 꺼야 합니다.
- Hobby 플랜에서 `top-stocks`(100종목 조회)가 타임아웃되면 Pro 플랜 또는
  `api/top-stocks.ts`의 종목 수 축소를 검토하세요.

## CasaOS 배포

## 준비물

- CasaOS에 Docker/Docker Compose 설치 (기본 포함)
- 이 폴더 전체를 홈서버로 복사 (예: `/DATA/AppData/a-stock`)

## 배포

```bash
cd /DATA/AppData/a-stock
docker compose up -d --build
```

- 접속: `http://<홈서버IP>:8090`
- 포트 변경: `docker-compose.yml`의 `"8090:80"` 수정 (앞 숫자가 호스트 포트)

## 로그인 계정 (Supabase Auth)

- 앱은 로그인 없이 그대로 사용할 수 있습니다. 우측 상단 **로그인** 버튼으로 이메일 회원가입·로그인합니다.
- 비로그인 시 자동매매 설정은 브라우저에만 저장되고, 로그인하면 계정별로 DB에 저장되어
  다른 기기에서도 같은 설정이 적용됩니다.
- CasaOS compose에는 postgres + GoTrue + PostgREST가 포함되어 있어 별도 가입 절차 없이
  바로 회원가입하면 됩니다 (이메일 확인 메일 없이 즉시 가입됨).
- Supabase Cloud를 직접 쓰는 경우: `supabase/migrations/20261005000000_auto_trade_settings.sql`을
  SQL Editor에서 실행하고, Auth → Providers → Email에서 Confirm email을 끄세요.
- 도메인 뒤에서 쓰는 경우 compose의 `API_EXTERNAL_URL`을 실제 주소로 바꾸세요.

## 참고

- `VITE_SUPABASE_URL`을 빈 값으로 빌드했으므로, 프런트는 같은 origin의
  `/functions/v1/*`을 호출합니다. 도메인·리버스프록시 뒤에서도 추가 설정 없이 동작합니다.
- 함수 컨테이너는 소스를 볼륨 마운트(`./supabase/functions`)하므로,
  함수 코드 수정 후 해당 컨테이너만 재시작하면 반영됩니다:
  `docker compose restart stock-data`
- 프런트 코드 수정 시: `docker compose up -d --build web`
- 중지: `docker compose down`
