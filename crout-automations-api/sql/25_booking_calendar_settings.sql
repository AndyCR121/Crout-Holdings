CREATE TABLE IF NOT EXISTS BookingCalendarSettings (
  booking_calendar_settings_id INT NOT NULL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  calendar_email VARCHAR(255) NOT NULL,
  updated_by_user_id INT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_calendar_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
  CHECK (provider IN ('google', 'outlook'))
);
