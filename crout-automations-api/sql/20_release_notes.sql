CREATE TABLE IF NOT EXISTS ReleaseNotes (
  refRelease INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  releaseVersion VARCHAR(32) NOT NULL,
  releaseDate DATE NOT NULL,
  releaseNotes LONGTEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NULL DEFAULT NULL,
  UNIQUE KEY ux_release_notes_version (releaseVersion),
  KEY ix_release_notes_date (releaseDate)
);
