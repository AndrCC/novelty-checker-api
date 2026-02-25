create extension if not exists "uuid-ossp";

create table if not exists corpus (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists corpus_doc (
  id uuid primary key default uuid_generate_v4(),
  corpus_id uuid not null references corpus(id) on delete cascade,
  title text not null,
  raw_text text not null
);

create table if not exists corpus_chunk (
  id uuid primary key default uuid_generate_v4(),
  corpus_id uuid not null references corpus(id) on delete cascade,
  doc_id uuid not null references corpus_doc(id) on delete cascade,
  chunk_index int not null,
  text text not null
);

create table if not exists corpus_index (
  corpus_id uuid primary key references corpus(id) on delete cascade,
  idf jsonb not null,
  vocab jsonb not null,
  created_at timestamptz not null default now()
);