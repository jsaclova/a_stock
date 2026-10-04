-- 주간/월간 매수 주기 설정 컬럼 추가
alter table public.auto_trade_settings
  add column if not exists frequency text not null default 'weekly',
  add column if not exists weekday integer not null default 5,
  add column if not exists monthday integer not null default 1;
