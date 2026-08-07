drop trigger if exists on_notification_send_push on public.notifications;
drop function if exists public.dispatch_push_notification();
drop table if exists public.device_tokens;
drop table if exists public.push_config;