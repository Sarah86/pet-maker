-- Users are managed by Supabase Auth (auth.users)

create table if not exists designs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users,          -- nullable: guests can upload
  file_url       text not null,
  printful_file_id text,
  created_at     timestamptz default now()
);

create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users,     -- nullable: guests can order
  printful_order_id   bigint unique,
  stripe_session_id   text unique,
  design_id           uuid references designs,
  product_name        text,
  variant_id          bigint,
  status              text default 'pending',         -- pending | in_production | shipped | delivered
  tracking_url        text,
  retail_price        numeric(10,2),
  currency            text default 'BRL',
  recipient_name      text,
  recipient_address   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS
alter table designs enable row level security;
alter table orders  enable row level security;

-- Logged-in users see their own rows; service role bypasses this entirely
create policy "own designs" on designs for all using (auth.uid() = user_id);
create policy "own orders"  on orders  for all using (auth.uid() = user_id);

-- Storage policies for the "designs" private bucket
-- Allow anyone (anon + authenticated) to upload and read for now
create policy "Anyone can upload designs"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'designs');

create policy "Anyone can read designs"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'designs');

create policy "Anyone can delete designs"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'designs');
