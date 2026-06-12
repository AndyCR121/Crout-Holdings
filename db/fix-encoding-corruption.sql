-- ============================================================
--  fix-encoding-corruption.sql
--  Crout Holdings PTY LTD — crout_automations DB
--
--  Problem : The en-dash (–) was double-encoded during import.
--            MySQL stored it as the 6-byte sequence:
--            C3 A2  E2 82 AC  E2 80 9D   (â€")
--            instead of the correct 3-byte UTF-8: E2 80 93
--
--  Fix     : Replace every occurrence of UNHEX('C3A2E282ACE2809D')
--            with a plain en-dash (-) across all affected tables.
--
--  Verified via: SELECT PackageName, HEX(PackageName) FROM Packages
-- ============================================================

USE crout_automations;

SET NAMES utf8mb4;

-- ── Services ──────────────────────────────────────────────────────────────────
UPDATE Services
SET
  ServiceName        = REPLACE(ServiceName,        UNHEX('C3A2E282ACE2809D'), '-'),
  ServiceDescription = REPLACE(ServiceDescription, UNHEX('C3A2E282ACE2809D'), '-')
WHERE
  ServiceName        LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR ServiceDescription LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── Addons ────────────────────────────────────────────────────────────────────
UPDATE Addons
SET
  AddonName        = REPLACE(AddonName,        UNHEX('C3A2E282ACE2809D'), '-'),
  AddonDescription = REPLACE(AddonDescription, UNHEX('C3A2E282ACE2809D'), '-')
WHERE
  AddonName        LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR AddonDescription LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── Packages ──────────────────────────────────────────────────────────────────
UPDATE Packages
SET
  PackageName        = REPLACE(PackageName,        UNHEX('C3A2E282ACE2809D'), '-'),
  PackageDescription = REPLACE(PackageDescription, UNHEX('C3A2E282ACE2809D'), '-')
WHERE
  PackageName        LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR PackageDescription LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── ServiceFeatures ───────────────────────────────────────────────────────────
UPDATE ServiceFeatures
SET   Feature = REPLACE(Feature, UNHEX('C3A2E282ACE2809D'), '-')
WHERE Feature LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── Users ─────────────────────────────────────────────────────────────────────
UPDATE Users
SET
  FirstName = REPLACE(FirstName, UNHEX('C3A2E282ACE2809D'), '-'),
  Surname   = REPLACE(Surname,   UNHEX('C3A2E282ACE2809D'), '-')
WHERE
  FirstName LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR Surname LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── Companies ─────────────────────────────────────────────────────────────────
UPDATE Companies
SET
  CompanyName = REPLACE(CompanyName, UNHEX('C3A2E282ACE2809D'), '-'),
  Industry    = REPLACE(Industry,    UNHEX('C3A2E282ACE2809D'), '-'),
  Address     = REPLACE(Address,     UNHEX('C3A2E282ACE2809D'), '-')
WHERE
  CompanyName LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR Industry LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%')
  OR Address  LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');

-- ── Verification (run after UPDATE to confirm 0 remaining) ────────────────────
SELECT 'Services'        AS tbl, COUNT(*) AS remaining FROM Services        WHERE ServiceName LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
SELECT 'Addons'          AS tbl, COUNT(*) AS remaining FROM Addons          WHERE AddonName   LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
SELECT 'Packages'        AS tbl, COUNT(*) AS remaining FROM Packages        WHERE PackageName LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
SELECT 'ServiceFeatures' AS tbl, COUNT(*) AS remaining FROM ServiceFeatures WHERE Feature     LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
SELECT 'Users'           AS tbl, COUNT(*) AS remaining FROM Users           WHERE FirstName   LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
SELECT 'Companies'       AS tbl, COUNT(*) AS remaining FROM Companies       WHERE CompanyName LIKE CONCAT('%', UNHEX('C3A2E282ACE2809D'), '%');
