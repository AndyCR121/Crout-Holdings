CREATE TABLE IF NOT EXISTS ContactRequests (
  contact_request_id INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Name               VARCHAR(160) NOT NULL,
  Email              VARCHAR(255) NOT NULL,
  Phone              VARCHAR(50)      NULL,
  Business           VARCHAR(160)     NULL,
  Service            VARCHAR(255) NOT NULL,
  Message            TEXT         NOT NULL,
  Referral           VARCHAR(64)      NULL,
  ConfigJson         JSON             NULL,
  Source             VARCHAR(255)     NULL,
  EmailSent          TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_requests_email (Email),
  KEY idx_contact_requests_created (CreatedAt)
);
