-- 趙妮綺粉絲站：Supabase 資料庫設定
-- 用法：Supabase 後台 → SQL Editor → New query → 貼上整份 → Run
-- 權限設計：所有人都能讀；只有 admins 名單裡的帳號能新增、修改、刪除。

-- ===== 管理員名單 =====
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- 不開放任何讀寫政策：名單只能在 Supabase 後台修改

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ===== 資料表 =====
create table if not exists public.profile (
  id int primary key default 1 check (id = 1),
  name text not null default '趙妮綺',
  latin text,
  tagline text,
  bio text,
  agency text,
  instagram text,
  photo text,
  updated_at timestamptz not null default now()
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  year text not null,
  title text not null,
  category text,
  role text,
  platform text,
  link text,
  note text,
  image text,
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  pub_date date not null,
  outlet text not null,
  title text not null,
  kind text,
  link text,
  summary text,
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  pub_date date not null,
  body text not null,
  link text,
  updated_at timestamptz not null default now()
);

-- 自動更新 updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['profile','works','interviews','news'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ===== 權限（RLS）=====
do $$
declare t text;
begin
  foreach t in array array['profile','works','interviews','news'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- ===== 圖片空間 =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ===== 初始內容（整理自公開報導）=====
insert into public.profile (id, name, tagline, bio, agency, instagram)
values (1, '趙妮綺',
  '台灣新生代演員。這裡整理她的作品、訪談與近況。',
  E'趙妮綺曾赴韓國求學，回台後主動寄出履歷，簽入張鈞甯的經紀公司，堅定走上演員這條路。\n\n2025 年她參與公視人生劇展《晚安，瑪卡龍》，飾演校花田田，和許莉廷、林毓家等演員同台。',
  '張鈞甯旗下經紀公司', 'tanya_o_c')
on conflict (id) do nothing;

insert into public.works (year, title, category, role, platform, link, note)
select '2025', '晚安，瑪卡龍', '單元劇', '田田', '公視人生劇展', 'https://n.yam.com/Article/20251118490425',
       '以校園賣藥黑市為主題的青春劇，結合魔神仔傳說與 Y2K 風格，由王傳宗、黃鈺婷共同執導。'
where not exists (select 1 from public.works where title = '晚安，瑪卡龍');

insert into public.interviews (pub_date, outlet, title, kind, link, summary)
select * from (values
  (date '2025-11-18', 'NOWnews', '《晚安，瑪卡龍》媒體茶敘：趙妮綺談赴韓求學與簽約經過', '記者會',
   'https://www.nownews.com/news/6755565', '劇組茶敘上，她分享在韓國念書時的經歷，以及回台後加入張鈞甯公司、決心當演員的過程。'),
  (date '2025-11-18', '蕃薯藤新聞', '王傳宗、黃鈺婷雙導演打造公視人生劇展《晚安，瑪卡龍》', '新聞報導',
   'https://n.yam.com/Article/20251118490425', '介紹這部青春劇的題材與演員陣容。')
) v(pub_date, outlet, title, kind, link, summary)
where not exists (select 1 from public.interviews);

insert into public.news (pub_date, body, link)
select date '2025-11-23', '公視人生劇展《晚安，瑪卡龍》首播，趙妮綺飾演校花田田。', 'https://www.nownews.com/news/6755565'
where not exists (select 1 from public.news);

-- ===== 最後一步：把你的管理員 Email 加進名單（改成你自己的）=====
-- insert into public.admins (email) values ('你的email@example.com');
