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
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
