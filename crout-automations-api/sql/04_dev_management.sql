USE crout_automations;

ALTER TABLE Users
  ADD COLUMN isDev TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN referral VARCHAR(100) NULL,
  ADD UNIQUE KEY uq_users_referral (referral),
  ADD KEY idx_users_isDev (isDev);

CREATE TABLE IF NOT EXISTS DevServices (
  devServiceId   INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId         INT           NOT NULL,
  userServiceId  INT           NOT NULL,
  commissionPerc DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
  cost           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  totalCommission DECIMAL(12,2)
    GENERATED ALWAYS AS (ROUND(cost * (commissionPerc / 100), 2)) STORED,
  isActive       TINYINT(1)    NOT NULL DEFAULT 1,
  activeUserServiceId INT
    GENERATED ALWAYS AS (CASE WHEN isActive = 1 THEN userServiceId ELSE NULL END) STORED,
  createdAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_devservices_user FOREIGN KEY (userId) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_devservices_userservice FOREIGN KEY (userServiceId) REFERENCES UserServices(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_devservices_active_userServiceId (activeUserServiceId),
  KEY idx_devservices_userId (userId),
  KEY idx_devservices_userServiceId (userServiceId)
);
