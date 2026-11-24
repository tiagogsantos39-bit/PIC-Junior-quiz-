
-- Execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.quiz_access_codes (
  id bigint generated always as identity primary key,
  code_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.quiz_access_codes enable row level security;

create table if not exists public.quiz_questions (
  id integer primary key,
  category text not null check (category in ('PIC Júnior','REDGIM')),
  question text not null,
  options jsonb not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text not null,
  image_url text
);
alter table public.quiz_questions enable row level security;

create or replace view public.public_quiz_questions as
select id, question, options, image_url from public.quiz_questions;

grant select on public.public_quiz_questions to anon, authenticated;


create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;

-- Ranking público: expõe somente nome e pontuação, sem acesso direto às tabelas.
create or replace view public.public_quiz_ranking as
select
  row_number() over (order by score desc, created_at asc, id asc)::integer as position,
  participant_name,
  score,
  total
from public.quiz_attempts
order by score desc, created_at asc, id asc;

grant select on public.public_quiz_ranking to anon, authenticated;

create table if not exists public.quiz_answers (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id integer not null references public.quiz_questions(id),
  selected_option char(1) not null check (selected_option in ('A','B','C','D')),
  is_correct boolean not null,
  unique(attempt_id, question_id)
);
alter table public.quiz_answers enable row level security;

create or replace function public.verify_quiz_code(p_code text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.quiz_access_codes
    where active = true and crypt(p_code, code_hash) = code_hash
  );
$$;
grant execute on function public.verify_quiz_code(text) to anon, authenticated;

create or replace function public.submit_quiz_attempt(p_name text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attempt uuid;
  v_score integer;
  v_total integer;
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 70 then
    raise exception 'Nome inválido';
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 10 then
    raise exception 'A tentativa deve conter exatamente 10 respostas';
  end if;
  if (select count(distinct (x->>'question_id')::integer) from jsonb_array_elements(p_answers) x) <> 10 then
    raise exception 'Existem questões repetidas ou inválidas';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_answers) x
    left join public.quiz_questions q on q.id = (x->>'question_id')::integer
    where q.id is null or (x->>'selected_option') not in ('A','B','C','D')
  ) then raise exception 'Resposta inválida'; end if;

  select count(*) into v_total from public.quiz_questions;
  if v_total <> 50 then raise exception 'Banco de questões incompleto'; end if;

  select count(*) into v_score
  from jsonb_array_elements(p_answers) x
  join public.quiz_questions q on q.id = (x->>'question_id')::integer
  where q.correct_option = (x->>'selected_option');

  insert into public.quiz_attempts(participant_name,score,total)
  values(trim(p_name),v_score,10) returning id into v_attempt;

  insert into public.quiz_answers(attempt_id,question_id,selected_option,is_correct)
  select v_attempt,(x->>'question_id')::integer,(x->>'selected_option')::char(1),
         q.correct_option = (x->>'selected_option')
  from jsonb_array_elements(p_answers) x
  join public.quiz_questions q on q.id = (x->>'question_id')::integer;

  return jsonb_build_object('attempt_id',v_attempt,'score',v_score,'total',10);
end;
$$;
grant execute on function public.submit_quiz_attempt(text,jsonb) to anon, authenticated;
-- Código inicial para testes. Troque por outro antes de divulgar o quiz.
insert into public.quiz_access_codes(code_hash)
select crypt('PIC2026', gen_salt('bf'))
where not exists (select 1 from public.quiz_access_codes);

-- As 50 questões são carregadas pelo seed.sql.
