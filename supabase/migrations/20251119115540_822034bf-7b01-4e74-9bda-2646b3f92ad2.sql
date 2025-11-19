-- Enable realtime for notification_reads table
ALTER TABLE notification_reads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_reads;