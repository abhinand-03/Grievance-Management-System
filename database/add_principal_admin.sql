-- Add Principal Admin Account
-- Run this script to add the admin table and principal account to an existing database
-- Username: principal@university.in
-- Password: principal@123

USE campus_relief_db;

-- Create admins table if not exists
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(255),
    principal_type ENUM('permanent', 'temporary') NOT NULL DEFAULT 'permanent',
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Insert Principal Admin
-- Password: principal@123
INSERT INTO admins (email, password, name, department, mobile, employee_id, designation) VALUES
('principal@university.in', '$2y$10$BXTgKmu6G30hm050MeLp8OXDtLnaO71Xw6Qkp9XklezFkDjlMIh5K', 'Dr. Principal', 'Administration', '9876543200', 'ADMIN001', 'Principal')
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    name = VALUES(name),
    department = VALUES(department);

SELECT 'Principal admin created successfully!' as message;
SELECT '  Username: principal@university.in' as info;
SELECT '  Password: principal@123' as info;
