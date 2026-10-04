#!/bin/bash
# CasaOS compose 내장 postgres 초기 스크립트
# AUTH_DB_PASSWORD 는 compose의 db 서비스 env와 동일해야 함
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create role authenticator login password '${AUTH_DB_PASSWORD}';
  grant anon, authenticated, service_role to authenticator;

  grant usage on schema public to anon, authenticated, service_role;

  -- GoTrue가 부팅 시 auth 스키마에 마이그레이션을 수행하므로 미리 생성
  create schema if not exists auth;

  create table if not exists public.auto_trade_settings (
    user_id uuid primary key,
    symbol text not null default 'SPYM',
    shares integer not null default 2,
    frequency text not null default 'weekly',
    weekday integer not null default 5,
    monthday integer not null default 1,
    updated_at timestamptz not null default now()
  );

  grant select, insert, update, delete on public.auto_trade_settings to authenticated;
  grant all on public.auto_trade_settings to service_role;
EOSQL
