-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule idle session archival every 15 minutes
-- Sessions that have been idle for 4+ hours are moved to 'archived' status
SELECT cron.schedule(
  'archive-idle-dash-sessions',
  '*/15 * * * *',
  'SELECT archive_idle_dash_sessions();'
);
