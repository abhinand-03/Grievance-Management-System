-- Principal transfer flow migration
-- Adds permanent/temporary principal support and invite-based handoff

USE campus_relief_db;

ALTER TABLE admins
    ADD COLUMN principal_type ENUM('permanent', 'temporary') NOT NULL DEFAULT 'permanent' AFTER designation;

CREATE TABLE IF NOT EXISTS principal_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(128) NOT NULL UNIQUE,
    requested_by_admin_id INT NOT NULL,
    requested_by_admin_name VARCHAR(255) NOT NULL,
    requested_by_admin_email VARCHAR(255) NOT NULL,
    new_principal_name VARCHAR(255) NOT NULL,
    new_principal_email VARCHAR(255) NOT NULL,
    new_principal_mobile VARCHAR(20) NOT NULL,
    transfer_mode ENUM('permanent', 'temporary') NOT NULL DEFAULT 'permanent',
    status ENUM('pending', 'awaiting_login', 'finalized', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    finalized_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_principal_invites_status (status),
    INDEX idx_principal_invites_email (new_principal_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
