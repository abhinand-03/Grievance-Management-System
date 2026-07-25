-- ============================================================
-- Escalation Module — Database Migration
-- Run once in phpMyAdmin or MySQL CLI:
--   USE campus_relief_db;
--   SOURCE /path/to/add_escalation_fields.sql;
-- ============================================================

USE campus_relief_db;

-- Add escalation metadata columns to grievances table.
-- IF NOT EXISTS guards prevent errors on re-run.

ALTER TABLE grievances
  ADD COLUMN IF NOT EXISTS is_escalated         TINYINT(1)              NOT NULL DEFAULT 0    COMMENT 'Flag: 1 = escalated to Principal'     AFTER escalated_at,
  ADD COLUMN IF NOT EXISTS escalated_to         VARCHAR(50)             DEFAULT NULL           COMMENT 'Escalation target (Principal)'        AFTER is_escalated,
  ADD COLUMN IF NOT EXISTS escalation_type      ENUM('manual','automatic') DEFAULT NULL        COMMENT 'How the escalation was triggered'     AFTER escalated_to,
  ADD COLUMN IF NOT EXISTS escalated_by_name    VARCHAR(255)            DEFAULT NULL           COMMENT 'Name of staff/system that escalated'  AFTER escalation_type,
  ADD COLUMN IF NOT EXISTS escalation_reason    TEXT                    DEFAULT NULL           COMMENT 'Reason provided at escalation time'   AFTER escalated_by_name,
  ADD COLUMN IF NOT EXISTS escalation_date      DATETIME                DEFAULT NULL           COMMENT 'When escalation was recorded'         AFTER escalation_reason,
  ADD COLUMN IF NOT EXISTS pending_working_days INT                     NOT NULL DEFAULT 0    COMMENT 'Working days elapsed since submission' AFTER escalation_date;

-- Index for fast escalation dashboard queries
ALTER TABLE grievances
  ADD INDEX IF NOT EXISTS idx_is_escalated    (is_escalated),
  ADD INDEX IF NOT EXISTS idx_escalation_type (escalation_type),
  ADD INDEX IF NOT EXISTS idx_escalation_date (escalation_date);

-- Sync existing rows: any grievance already in status='escalated'
-- should have is_escalated=1 so the new module picks them up correctly.
UPDATE grievances
SET    is_escalated    = 1,
       escalated_to    = 'Principal',
       escalation_type = 'manual',
       escalation_date = COALESCE(escalated_at, updated_at)
WHERE  status = 'escalated'
  AND  is_escalated = 0;

SELECT CONCAT('Migration complete. Synced ', ROW_COUNT(), ' existing escalated rows.') AS message;
