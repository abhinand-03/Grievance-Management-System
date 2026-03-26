-- Campus Relief Stream Database Schema
-- Import this file into phpMyAdmin or MySQL

-- Create the database
CREATE DATABASE IF NOT EXISTS campus_relief_db;
USE campus_relief_db;

-- Drop tables if they exist (for fresh install)
DROP TABLE IF EXISTS status_logs;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS grievances;
DROP TABLE IF EXISTS users;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
    department VARCHAR(255),
    mobile VARCHAR(20),
    student_id VARCHAR(50),
    employee_id VARCHAR(50),
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GRIEVANCES TABLE
-- ============================================
CREATE TABLE grievances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    category ENUM('academic', 'sanitation', 'harassment', 'canteen', 'infrastructure', 'wifi_lab', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated') NOT NULL DEFAULT 'pending',
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    is_anonymous TINYINT(1) DEFAULT 0,
    assigned_to INT,
    assigned_to_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    escalated_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_student (student_id),
    INDEX idx_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ATTACHMENTS TABLE
-- ============================================
CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grievance_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type ENUM('image', 'pdf', 'document') NOT NULL,
    size INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grievance_id INT NOT NULL,
    user_id INT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role ENUM('student', 'staff', 'admin') NOT NULL,
    content TEXT NOT NULL,
    is_internal TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_grievance (grievance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STATUS LOGS TABLE
-- ============================================
CREATE TABLE status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grievance_id INT NOT NULL,
    from_status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated'),
    to_status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated') NOT NULL,
    changed_by INT,
    changed_by_name VARCHAR(255) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_grievance (grievance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NO DEFAULT USERS
-- ============================================
-- All users (students, staff, and admins) should be created via the application
-- or manually inserted into the database as needed.
-- 
-- To create an admin user manually, use:
-- INSERT INTO users (email, password, name, role, department) VALUES
-- ('admin@university.edu', '$2y$10$YOUR_HASHED_PASSWORD', 'Admin Name', 'admin', 'Administration');
-- 
-- Generate password hash with: password_hash('your_password', PASSWORD_DEFAULT) in PHP

-- ============================================
-- VIEWS FOR DASHBOARD STATISTICS
-- ============================================

-- View for grievance statistics
CREATE OR REPLACE VIEW grievance_stats AS
SELECT 
    COUNT(*) as total_grievances,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) ELSE NULL END) as avg_resolution_time
FROM grievances;

-- View for category breakdown
CREATE OR REPLACE VIEW category_breakdown AS
SELECT category, COUNT(*) as count
FROM grievances
GROUP BY category;

-- View for priority breakdown
CREATE OR REPLACE VIEW priority_breakdown AS
SELECT priority, COUNT(*) as count
FROM grievances
GROUP BY priority;

-- View for monthly trend
CREATE OR REPLACE VIEW monthly_trend AS
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as month,
    COUNT(*) as count
FROM grievances
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC
LIMIT 12;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure to generate ticket number
CREATE PROCEDURE generate_ticket_number(OUT new_ticket VARCHAR(50))
BEGIN
    DECLARE year_val INT;
    DECLARE max_num INT;
    
    SET year_val = YEAR(CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(ticket_number, '-', -1) AS UNSIGNED)), 0) + 1
    INTO max_num
    FROM grievances
    WHERE ticket_number LIKE CONCAT('GRV-', year_val, '-%');
    
    SET new_ticket = CONCAT('GRV-', year_val, '-', LPAD(max_num, 3, '0'));
END //

-- Procedure to create a new grievance
CREATE PROCEDURE create_grievance(
    IN p_student_id INT,
    IN p_category VARCHAR(50),
    IN p_priority VARCHAR(20),
    IN p_subject VARCHAR(500),
    IN p_description TEXT,
    IN p_is_anonymous TINYINT
)
BEGIN
    DECLARE v_ticket_number VARCHAR(50);
    DECLARE v_student_name VARCHAR(255);
    DECLARE v_student_email VARCHAR(255);
    DECLARE v_grievance_id INT;
    
    CALL generate_ticket_number(v_ticket_number);
    
    SELECT name, email INTO v_student_name, v_student_email
    FROM users WHERE id = p_student_id;
    
    IF p_is_anonymous = 1 THEN
        SET v_student_name = 'Anonymous';
        SET v_student_email = 'hidden@university.edu';
    END IF;
    
    INSERT INTO grievances (ticket_number, student_id, student_name, student_email, category, priority, status, subject, description, is_anonymous)
    VALUES (v_ticket_number, p_student_id, v_student_name, v_student_email, p_category, p_priority, 'pending', p_subject, p_description, p_is_anonymous);
    
    SET v_grievance_id = LAST_INSERT_ID();
    
    -- Log the initial status
    INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by, changed_by_name)
    VALUES (v_grievance_id, NULL, 'pending', p_student_id, v_student_name);
    
    -- Auto-escalate critical grievances
    IF p_priority = 'critical' THEN
        UPDATE grievances SET status = 'escalated', escalated_at = CURRENT_TIMESTAMP WHERE id = v_grievance_id;
        INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by_name, reason)
        VALUES (v_grievance_id, 'pending', 'escalated', 'System', 'Critical priority - auto-escalated to Admin');
    END IF;
    
    SELECT v_grievance_id as grievance_id, v_ticket_number as ticket_number;
END //

-- Procedure to update grievance status
CREATE PROCEDURE update_grievance_status(
    IN p_grievance_id INT,
    IN p_new_status VARCHAR(20),
    IN p_changed_by INT,
    IN p_reason TEXT
)
BEGIN
    DECLARE v_old_status VARCHAR(20);
    DECLARE v_changed_by_name VARCHAR(255);
    
    SELECT status INTO v_old_status FROM grievances WHERE id = p_grievance_id;
    SELECT name INTO v_changed_by_name FROM users WHERE id = p_changed_by;
    
    UPDATE grievances 
    SET status = p_new_status,
        resolved_at = IF(p_new_status = 'resolved', CURRENT_TIMESTAMP, resolved_at),
        escalated_at = IF(p_new_status = 'escalated', CURRENT_TIMESTAMP, escalated_at)
    WHERE id = p_grievance_id;
    
    INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by, changed_by_name, reason)
    VALUES (p_grievance_id, v_old_status, p_new_status, p_changed_by, v_changed_by_name, p_reason);
END //

DELIMITER ;

-- Success message
SELECT 'Database setup completed successfully!' as message;
