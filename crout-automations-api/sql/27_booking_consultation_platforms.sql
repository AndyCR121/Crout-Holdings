-- Safe to rerun on MySQL versions without ADD COLUMN IF NOT EXISTS.
SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'BookingCalendarSettings' AND column_name = 'consultation_platforms'),
  'SELECT 1',
  'ALTER TABLE BookingCalendarSettings ADD COLUMN consultation_platforms VARCHAR(500) NOT NULL DEFAULT \'Teams,Slack,Discord\' AFTER available_days'
);
PREPARE booking_consultation_platforms FROM @sql;
EXECUTE booking_consultation_platforms;
DEALLOCATE PREPARE booking_consultation_platforms;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'ConsultationBookings' AND column_name = 'consultation_platform'),
  'SELECT 1',
  'ALTER TABLE ConsultationBookings ADD COLUMN consultation_platform VARCHAR(80) NOT NULL DEFAULT \'To be confirmed\' AFTER ends_at'
);
PREPARE booking_platform FROM @sql;
EXECUTE booking_platform;
DEALLOCATE PREPARE booking_platform;
