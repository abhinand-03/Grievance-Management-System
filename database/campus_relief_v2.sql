-- Campus Relief Stream Database Schema v2
-- Separate tables for Students and Staff
-- Import this file into phpMyAdmin or MySQL

-- Create the database
CREATE DATABASE IF NOT EXISTS campus_relief_db;
USE campus_relief_db;

-- Drop tables if they exist (for fresh install)
DROP TABLE IF EXISTS status_logs;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS grievances;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS students;

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    year_of_study INT,
    section VARCHAR(10),
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STAFF TABLE (department-level faculty)
-- ============================================
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('staff', 'admin') NOT NULL DEFAULT 'staff',
    department VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(255),
    is_approved TINYINT(1) DEFAULT 0,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADMINS TABLE (system-level administrators like Principal)
-- ============================================
CREATE TABLE admins (
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

-- ============================================
-- GRIEVANCES TABLE
-- ============================================
CREATE TABLE grievances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    category ENUM('academics', 'library', 'mens_hostel', 'womens_hostel', 'canteen') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated', 'solved', 'considered', 'denied') NOT NULL DEFAULT 'pending',
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    is_anonymous TINYINT(1) DEFAULT 0,
    assigned_to INT,
    assigned_to_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    escalated_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL,
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
    user_type ENUM('student', 'staff') NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role ENUM('student', 'staff', 'admin') NOT NULL,
    content TEXT NOT NULL,
    is_internal TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
    INDEX idx_grievance (grievance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STATUS LOGS TABLE
-- ============================================
CREATE TABLE status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grievance_id INT NOT NULL,
    from_status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated', 'solved', 'considered', 'denied'),
    to_status ENUM('pending', 'in_review', 'resolved', 'rejected', 'escalated', 'solved', 'considered', 'denied') NOT NULL,
    changed_by INT,
    changed_by_type ENUM('student', 'staff', 'admin'),
    changed_by_name VARCHAR(255) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
    INDEX idx_grievance (grievance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================
-- Password hash for 'password': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Sample Students
INSERT INTO students (email, password, name, department, mobile, student_id, year_of_study, section) VALUES
('john.doe@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Doe', 'Computer Science', '9876543210', 'STU001', 3, 'A'),
('emily.p@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emily Parker', 'Business Administration', '9876543211', 'STU002', 2, 'B'),
('alex.k@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Kumar', 'Computer Science', '9876543212', 'STU003', 4, 'A'),
('maria.s@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Maria Santos', 'Engineering', '9876543213', 'STU004', 1, 'C');

-- Sample Staff (Department HODs and Category-specific staff)
-- Password: password
INSERT INTO staff (email, password, name, role, department, mobile, employee_id, designation, is_approved) VALUES
-- Department HODs (for Academics category - assigned based on student's department)
('hod.cs@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Rajesh Kumar', 'staff', 'Computer Science', '9876543220', 'EMP001', 'Head of Department', 1),
('hod.ba@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Priya Sharma', 'staff', 'Business Administration', '9876543221', 'EMP002', 'Head of Department', 1),
('hod.eng@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Suresh Reddy', 'staff', 'Engineering', '9876543222', 'EMP003', 'Head of Department', 1),
-- Category-specific staff
('librarian@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mrs. Lakshmi Devi', 'staff', 'Library', '9876543223', 'EMP004', 'Chief Librarian', 1),
('mens.warden@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mr. Venkat Rao', 'staff', 'Mens Hostel', '9876543224', 'EMP005', 'Hostel Warden', 1),
('womens.warden@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mrs. Anitha Reddy', 'staff', 'Womens Hostel', '9876543225', 'EMP006', 'Hostel Warden', 1),
('canteen.incharge@university.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mr. Ramesh Babu', 'staff', 'Canteen', '9876543226', 'EMP007', 'Canteen In-charge', 1);

-- Sample Admin (Principal - System Administrator)
-- Password: principal@123
INSERT INTO admins (email, password, name, department, mobile, employee_id, designation) VALUES
('principal@university.in', '$2y$10$BXTgKmu6G30hm050MeLp8OXDtLnaO71Xw6Qkp9XklezFkDjlMIh5K', 'Dr. Principal', 'Administration', '9876543200', 'ADMIN001', 'Principal');

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

-- Success message
SELECT 'Database setup completed successfully with separate Student and Staff tables!' as message;
