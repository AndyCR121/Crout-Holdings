-- Custom Form share links: lets a portal user generate a revocable, long-lived,
-- unauthenticated URL for one Custom Form. Tokens are stored hashed only — the raw
-- token is returned to the owner exactly once, at generation time, and cannot be
-- redisplayed afterward (see openspec/changes/custom-form-share-links/design.md D1).
CREATE TABLE CustomFormShareLinks (
  share_link_id      INT AUTO_INCREMENT PRIMARY KEY,
  user_service_id    INT NOT NULL,
  created_by_user_id INT NOT NULL,
  token_hash          CHAR(64) NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          DATETIME NOT NULL,
  revoked_at          DATETIME NULL,
  CONSTRAINT fk_share_link_user_service
    FOREIGN KEY (user_service_id) REFERENCES UserServices(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_share_link_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT uq_share_link_token_hash UNIQUE (token_hash),
  INDEX ix_share_link_user_service_active (user_service_id, revoked_at)
);

-- Audit trail for public access to a share link (both page views and submissions).
-- Kept as its own table rather than repurposing ServiceTriggerExecutions, whose
-- user_id/company_id columns are non-nullable and mean "the logged-in user who
-- triggered this" (see design.md D3).
CREATE TABLE CustomFormShareLinkAccesses (
  access_id                    INT AUTO_INCREMENT PRIMARY KEY,
  share_link_id                INT NOT NULL,
  accessed_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action                       ENUM('view', 'submit') NOT NULL,
  service_trigger_execution_id INT NULL,
  CONSTRAINT fk_share_link_access_share_link
    FOREIGN KEY (share_link_id) REFERENCES CustomFormShareLinks(share_link_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_share_link_access_execution
    FOREIGN KEY (service_trigger_execution_id) REFERENCES ServiceTriggerExecutions(service_trigger_execution_id)
    ON DELETE SET NULL,
  INDEX ix_share_link_access_share_link (share_link_id, accessed_at)
);
