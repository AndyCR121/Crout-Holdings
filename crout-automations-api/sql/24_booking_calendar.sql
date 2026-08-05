-- Website consultation booking calendar
ALTER TABLE Users
  ADD COLUMN marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1 AFTER CellNumber;

CREATE TABLE IF NOT EXISTS BookingAvailabilityBlocks (
  availability_block_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  note VARCHAR(255) NULL,
  created_by_user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_block_user FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CHECK (ends_at > starts_at),
  INDEX idx_booking_block_range (starts_at, ends_at)
);

CREATE TABLE IF NOT EXISTS ConsultationBookings (
  booking_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consultation_booking_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CHECK (ends_at > starts_at),
  INDEX idx_consultation_booking_range (starts_at, ends_at),
  INDEX idx_consultation_booking_user (user_id)
);
