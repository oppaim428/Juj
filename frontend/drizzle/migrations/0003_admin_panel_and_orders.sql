-- Order lifecycle enums
create type public.order_status as enum ('pending_payment','paid','delivering','delivered','completed','cancelled','refunded','disputed','needs_attention');
create type public.payment_status as enum ('pending','succeeded','failed','refunded');
create type public.coupon_type as enum ('percent','fixed');

-- Orders (buyer_id nullable for guest checkout)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  buyer_id uuid references public.profiles(id),
  guest_email text,
  status public.order_status not null default 'pending_payment',
  total_minor integer not null default 0,
  currency char(3) not null default 'USD',
  coupon_id uuid,
  access_token_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = buyer_id);
create policy "admin orders all" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  offer_id bigint not null references public.offers(id),
  option_id uuid references public.offer_options(id),
  seller_id uuid not null references public.seller_profiles(user_id),
  qty integer not null default 1,
  unit_price_minor integer not null,
  commission_minor integer not null default 0,
  buyer_inputs jsonb not null default '{}',
  status public.order_status not null default 'pending_payment',
  delivered_at timestamptz
);
grant select, insert, update on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own order items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "seller order items read" on public.order_items for select to authenticated using (seller_id = auth.uid());
create policy "admin order items all" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  method text,
  amount_minor integer not null,
  currency char(3) not null default 'USD',
  status public.payment_status not null default 'pending',
  raw jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own payments read" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "admin payments all" on public.payments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.coupon_type not null,
  value integer not null,
  min_total integer not null default 0,
  usage_limit integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_to timestamptz,
  is_active boolean not null default true
);
grant select on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "admin coupons all" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Admin policies on existing tables
create policy "admin profiles read" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin profiles update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin sellers update" on public.seller_profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin offers all" on public.offers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin categories all" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin roles read" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));