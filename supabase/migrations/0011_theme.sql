-- Appearance. A member's choice of dark, light or follow-the-phone, kept on
-- the profile so it travels with them across devices and the installed app.
-- Dark stays the default: it is the brand (brief section 10) and what every
-- screen was designed on.

alter table public.profiles
  add column if not exists theme text not null default 'dark';

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('dark', 'light', 'system'));
