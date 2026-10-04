-- 개인별 주간 자동매매 설정 (user_id = auth.users.id)
create table if not exists public.auto_trade_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  symbol text not null default 'SPYM',
  shares integer not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.auto_trade_settings enable row level security;

drop policy if exists "own row only" on public.auto_trade_settings;
create policy "own row only"
  on public.auto_trade_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.auto_trade_settings to authenticated;
