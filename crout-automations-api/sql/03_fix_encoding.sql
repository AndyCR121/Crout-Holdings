-- =============================================================================
-- 03_fix_encoding.sql
-- Replace mojibake â€" (UTF-8 en-dash misread as latin-1 / cp1252) with a
-- plain hyphen-minus (-) across every text column in crout_automations.
--
-- The sequence â€" is the three bytes 0xE2 0x80 0x93 (UTF-8 en-dash U+2013)
-- rendered through a latin-1 lens. Run this once after correcting your DB /
-- connection charset, or whenever legacy data is imported.
--
-- Safe to run multiple times — REPLACE() is idempotent once clean.
--
-- After running, make sure your connection string includes:
--   CharSet=utf8mb4;
-- to prevent the same corruption on future inserts.
-- =============================================================================

USE crout_automations;

-- ── Services ──────────────────────────────────────────────────────────────────
UPDATE Services
SET
  ServiceName        = REPLACE(ServiceName,        'â€"', '-'),
  ServiceDescription = REPLACE(ServiceDescription, 'â€"', '-')
WHERE
  ServiceName        LIKE '%â€"%'
  OR ServiceDescription LIKE '%â€"%';

-- ── Addons ────────────────────────────────────────────────────────────────────
UPDATE Addons
SET
  AddonName        = REPLACE(AddonName,        'â€"', '-'),
  AddonDescription = REPLACE(AddonDescription, 'â€"', '-')
WHERE
  AddonName        LIKE '%â€"%'
  OR AddonDescription LIKE '%â€"%';

-- ── Packages ──────────────────────────────────────────────────────────────────
UPDATE Packages
SET
  PackageName        = REPLACE(PackageName,        'â€"', '-'),
  PackageDescription = REPLACE(PackageDescription, 'â€"', '-')
WHERE
  PackageName        LIKE '%â€"%'
  OR PackageDescription LIKE '%â€"%';

-- ── ServiceFeatures ───────────────────────────────────────────────────────────
UPDATE ServiceFeatures
SET
  Feature = REPLACE(Feature, 'â€"', '-')
WHERE
  Feature LIKE '%â€"%';

-- ── Users (display names) ─────────────────────────────────────────────────────
UPDATE Users
SET
  FirstName = REPLACE(FirstName, 'â€"', '-'),
  Surname   = REPLACE(Surname,   'â€"', '-')
WHERE
  FirstName LIKE '%â€"%'
  OR Surname LIKE '%â€"%';

-- ── Companies ─────────────────────────────────────────────────────────────────
UPDATE Companies
SET
  CompanyName = REPLACE(CompanyName, 'â€"', '-'),
  Industry    = REPLACE(Industry,    'â€"', '-'),
  Address     = REPLACE(Address,     'â€"', '-')
WHERE
  CompanyName LIKE '%â€"%'
  OR Industry LIKE '%â€"%'
  OR Address  LIKE '%â€"%';

-- =============================================================================
-- Verification — uncomment and run after the updates to confirm zero remaining.
-- =============================================================================
-- SELECT 'Services'        AS tbl, COUNT(*) AS remaining FROM Services        WHERE ServiceName LIKE '%â€"%' OR ServiceDescription LIKE '%â€"%';
-- SELECT 'Addons'          AS tbl, COUNT(*) AS remaining FROM Addons          WHERE AddonName   LIKE '%â€"%' OR AddonDescription   LIKE '%â€"%';
-- SELECT 'Packages'        AS tbl, COUNT(*) AS remaining FROM Packages        WHERE PackageName LIKE '%â€"%' OR PackageDescription  LIKE '%â€"%';
-- SELECT 'ServiceFeatures' AS tbl, COUNT(*) AS remaining FROM ServiceFeatures WHERE Feature     LIKE '%â€"%';
-- SELECT 'Users'           AS tbl, COUNT(*) AS remaining FROM Users           WHERE FirstName   LIKE '%â€"%' OR Surname LIKE '%â€"%';
-- SELECT 'Companies'       AS tbl, COUNT(*) AS remaining FROM Companies       WHERE CompanyName LIKE '%â€"%' OR Industry LIKE '%â€"%' OR Address LIKE '%â€"%';
