-- Announcements table for campus relief system
-- Run this SQL to add announcements functionality

USE campus_relief_db;

-- Drop table if exists
DROP TABLE IF EXISTS announcement_reads;
DROP TABLE IF EXISTS announcements;

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    publisher_id INT NOT NULL,
    publisher_type ENUM('admin', 'staff') NOT NULL,
    publisher_name VARCHAR(255) NOT NULL,
    target_audience ENUM('all', 'students', 'staff', 'both') NOT NULL DEFAULT 'all',
    target_department VARCHAR(255) DEFAULT NULL, -- NULL means all departments
    priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'normal',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ANNOUNCEMENT READS TABLE (track who has read)
-- ============================================
CREATE TABLE announcement_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('student', 'staff', 'admin') NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_read (announcement_id, user_id, user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATIONS TABLE (for grievance updates)
-- ============================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('student', 'staff', 'admin') NOT NULL,
    type ENUM('grievance_update', 'grievance_assigned', 'grievance_resolved', 'grievance_escalated', 'comment_added') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_id INT DEFAULT NULL, -- grievance_id or other reference
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster queries
CREATE INDEX idx_notifications_user ON notifications(user_id, user_type, is_read);
CREATE INDEX idx_announcements_target ON announcements(target_audience, is_active);
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id, user_type);

-- Sample announcements
INSERT INTO announcements (title, content, publisher_id, publisher_type, publisher_name, target_audience, priority) VALUES
('Welcome to Campus Grievance Portal', 'We are pleased to announce the launch of our new grievance management system. Students can now submit and track their grievances online.', 1, 'admin', 'Principal', 'all', 'important'),
('Library Timings Updated', 'The library will now remain open until 10 PM on weekdays. Please make use of this extended timing for your studies.', 1, 'admin', 'Principal', 'students', 'normal');
