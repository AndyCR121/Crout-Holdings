-- Safe to rerun on MySQL versions that do not support ADD COLUMN IF NOT EXISTS.
SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'BookingCalendarSettings' AND column_name = 'availability_start'),
  'SELECT 1',
  'ALTER TABLE BookingCalendarSettings ADD COLUMN availability_start TIME NOT NULL DEFAULT \'08:00:00\' AFTER calendar_email'
);
PREPARE booking_availability_start FROM @sql;
EXECUTE booking_availability_start;
DEALLOCATE PREPARE booking_availability_start;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'BookingCalendarSettings' AND column_name = 'availability_end'),
  'SELECT 1',
  'ALTER TABLE BookingCalendarSettings ADD COLUMN availability_end TIME NOT NULL DEFAULT \'16:00:00\' AFTER availability_start'
);
PREPARE booking_availability_end FROM @sql;
EXECUTE booking_availability_end;
DEALLOCATE PREPARE booking_availability_end;

SET @sql = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'BookingCalendarSettings' AND column_name = 'available_days'),
  'SELECT 1',
  'ALTER TABLE BookingCalendarSettings ADD COLUMN available_days VARCHAR(20) NOT NULL DEFAULT \'1,2,3,4,5\' AFTER availability_end'
);
PREPARE booking_available_days FROM @sql;
EXECUTE booking_available_days;
DEALLOCATE PREPARE booking_available_days;
