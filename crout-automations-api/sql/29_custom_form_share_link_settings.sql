-- Extends Custom Form share links with a chosen share method (URL vs. Email) and, for
-- Email, a recipient address list. See openspec/changes/custom-form-share-links/design.md
-- D8/D9 — validity itself stays on the existing expires_at column (owner-chosen days,
-- capped at 365, computed at generation time; no schema change needed for that part).
ALTER TABLE CustomFormShareLinks
  ADD COLUMN share_method ENUM('url', 'email') NOT NULL DEFAULT 'url' AFTER revoked_at;

-- Recipient addresses for share_method = 'email'. Kept as its own table (not a JSON
-- column) since it's a variable-length list per link.
CREATE TABLE CustomFormShareLinkRecipients (
  recipient_id   INT AUTO_INCREMENT PRIMARY KEY,
  share_link_id  INT NOT NULL,
  email          VARCHAR(320) NOT NULL,
  CONSTRAINT fk_share_link_recipient_share_link
    FOREIGN KEY (share_link_id) REFERENCES CustomFormShareLinks(share_link_id)
    ON DELETE CASCADE,
  INDEX ix_share_link_recipient_share_link (share_link_id)
);
