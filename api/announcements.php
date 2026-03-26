<?php
/**
 * Announcements API
 * Handles CRUD operations for announcements and notifications
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($action === 'notifications') {
            getNotifications();
        } else if ($action === 'unread-count') {
            getUnreadCount();
        } else if ($id) {
            getAnnouncement($id);
        } else {
            getAnnouncements();
        }
        break;
        
    case 'POST':
        if ($action === 'mark-read') {
            markAsRead();
        } else if ($action === 'mark-all-read') {
            markAllAsRead();
        } else {
            createAnnouncement();
        }
        break;
        
    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'Announcement ID required'], 400);
        }
        updateAnnouncement($id);
        break;
        
    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'Announcement ID required'], 400);
        }
        deleteAnnouncement($id);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getAnnouncements() {
    $authUser = requireAuth();
    $db = getDB();
    
    $userRole = strtolower($authUser['role'] ?? '');
    $userId = $authUser['id'];
    $userDept = $authUser['department'] ?? '';
    
    // Build query based on user role
    $where = ["a.is_active = 1"];
    $params = [];
    
    if ($userRole === 'student') {
        // Students see announcements targeted to 'all', 'students', or 'both'
        $where[] = "a.target_audience IN ('all', 'students', 'both')";
        // Filter by department - show if no department specified OR user's department is in the list
        $where[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $params[] = $userDept;
    } else if ($userRole === 'staff') {
        // Staff sees announcements targeted to 'staff', 'all', or 'both' - NOT student-only
        $where[] = "a.target_audience IN ('all', 'staff', 'both')";
        // Filter by department - show if no department specified OR user's department is in the list
        $where[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $params[] = $userDept;
    } else if ($userRole === 'admin') {
        // Admin sees all announcements - no audience filter
    } else {
        // Unknown role - show nothing for safety
        $where[] = "1 = 0";
    }
    
    $whereClause = implode(' AND ', $where);
    
    $sql = "SELECT a.*, 
            (SELECT COUNT(*) FROM announcement_reads ar 
             WHERE ar.announcement_id = a.id AND ar.user_id = ? AND ar.user_type = ?) as is_read
            FROM announcements a
            WHERE $whereClause
            ORDER BY a.priority DESC, a.created_at DESC
            LIMIT 50";
    
    array_unshift($params, $userId, $userRole);
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $announcements = $stmt->fetchAll();
    
    jsonResponse(['announcements' => $announcements]);
}

function getAnnouncement($id) {
    $authUser = requireAuth();
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    $announcement = $stmt->fetch();
    
    if (!$announcement) {
        jsonResponse(['error' => 'Announcement not found'], 404);
    }
    
    // Mark as read
    $stmt = $db->prepare("INSERT IGNORE INTO announcement_reads (announcement_id, user_id, user_type) VALUES (?, ?, ?)");
    $stmt->execute([$id, $authUser['id'], $authUser['role']]);
    
    jsonResponse($announcement);
}

function createAnnouncement() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    // Only admin and staff can create announcements
    if ($authUser['role'] !== 'admin' && $authUser['role'] !== 'staff') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    // Staff can only publish to students
    if ($authUser['role'] === 'staff' && isset($data['targetAudience']) && $data['targetAudience'] === 'staff') {
        jsonResponse(['error' => 'Staff can only publish announcements to students'], 403);
    }
    
    $title = $data['title'] ?? '';
    $content = $data['content'] ?? '';
    $targetAudience = $data['targetAudience'] ?? 'all';
    $targetDepartment = $data['targetDepartment'] ?? null;
    $priority = $data['priority'] ?? 'normal';
    
    if (empty($title) || empty($content)) {
        jsonResponse(['error' => 'Title and content are required'], 400);
    }
    
    // Staff can only publish to students or their department
    if ($authUser['role'] === 'staff') {
        $targetAudience = 'students';
    }
    
    $stmt = $db->prepare("INSERT INTO announcements (title, content, publisher_id, publisher_type, publisher_name, target_audience, target_department, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $title,
        $content,
        $authUser['id'],
        $authUser['role'],
        $authUser['name'],
        $targetAudience,
        $targetDepartment,
        $priority
    ]);
    
    $announcementId = $db->lastInsertId();
    
    jsonResponse([
        'message' => 'Announcement published successfully',
        'id' => $announcementId
    ], 201);
}

function updateAnnouncement($id) {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    // Get existing announcement
    $stmt = $db->prepare("SELECT * FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    $announcement = $stmt->fetch();
    
    if (!$announcement) {
        jsonResponse(['error' => 'Announcement not found'], 404);
    }
    
    // Only the publisher or admin can update
    if ($authUser['role'] !== 'admin' && $announcement['publisher_id'] != $authUser['id']) {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $title = $data['title'] ?? $announcement['title'];
    $content = $data['content'] ?? $announcement['content'];
    $targetAudience = $data['targetAudience'] ?? $announcement['target_audience'];
    $targetDepartment = $data['targetDepartment'] ?? $announcement['target_department'];
    $priority = $data['priority'] ?? $announcement['priority'];
    $isActive = isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : $announcement['is_active'];
    
    $stmt = $db->prepare("UPDATE announcements SET title = ?, content = ?, target_audience = ?, target_department = ?, priority = ?, is_active = ? WHERE id = ?");
    $stmt->execute([$title, $content, $targetAudience, $targetDepartment, $priority, $isActive, $id]);
    
    jsonResponse(['message' => 'Announcement updated successfully']);
}

function deleteAnnouncement($id) {
    $authUser = requireAuth();
    $db = getDB();
    
    // Get existing announcement
    $stmt = $db->prepare("SELECT * FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    $announcement = $stmt->fetch();
    
    if (!$announcement) {
        jsonResponse(['error' => 'Announcement not found'], 404);
    }
    
    // Only the publisher or admin can delete
    if ($authUser['role'] !== 'admin' && $announcement['publisher_id'] != $authUser['id']) {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $stmt = $db->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    
    jsonResponse(['message' => 'Announcement deleted successfully']);
}

function getNotifications() {
    $authUser = requireAuth();
    $db = getDB();
    
    $userId = $authUser['id'];
    $userRole = strtolower($authUser['role'] ?? '');
    $userDept = $authUser['department'] ?? '';
    
    $notifications = [];
    
    // Get grievance-related notifications for students
    if ($userRole === 'student') {
        $stmt = $db->prepare("SELECT g.id, g.ticket_number, g.subject, g.status, g.updated_at,
            CASE 
                WHEN g.status = 'resolved' THEN 'Your grievance has been resolved'
                WHEN g.status = 'rejected' THEN 'Your grievance has been rejected'
                WHEN g.status = 'in_review' THEN 'Your grievance is being reviewed'
                WHEN g.status = 'escalated' THEN 'Your grievance has been escalated'
                WHEN g.status = 'solved' THEN 'Your grievance has been solved by Principal'
                WHEN g.status = 'considered' THEN 'Your grievance is under consideration'
                WHEN g.status = 'denied' THEN 'Your grievance has been denied'
                ELSE 'Grievance status updated'
            END as message
            FROM grievances g 
            WHERE g.student_id = ? AND g.status != 'pending'
            ORDER BY g.updated_at DESC LIMIT 10");
        $stmt->execute([$userId]);
        $grievanceNotifs = $stmt->fetchAll();
        
        foreach ($grievanceNotifs as $g) {
            $notifications[] = [
                'id' => 'g_' . $g['id'],
                'type' => 'grievance',
                'title' => $g['ticket_number'] . ': ' . substr($g['subject'], 0, 30),
                'message' => $g['message'],
                'reference_id' => $g['id'],
                'created_at' => $g['updated_at'],
                'is_read' => 0
            ];
        }
    }
    
    // Get assigned grievance notifications for staff
    if ($userRole === 'staff') {
        $stmt = $db->prepare("SELECT g.id, g.ticket_number, g.subject, g.status, g.created_at
            FROM grievances g 
            WHERE g.assigned_to = ? AND g.status IN ('pending', 'in_review')
            ORDER BY g.created_at DESC LIMIT 10");
        $stmt->execute([$userId]);
        $assignedGrievances = $stmt->fetchAll();
        
        foreach ($assignedGrievances as $g) {
            $notifications[] = [
                'id' => 'g_' . $g['id'],
                'type' => 'grievance',
                'title' => 'New Grievance Assigned',
                'message' => $g['ticket_number'] . ': ' . substr($g['subject'], 0, 40),
                'reference_id' => $g['id'],
                'created_at' => $g['created_at'],
                'is_read' => 0
            ];
        }
    }
    
    // Get escalated grievances for admin
    if ($userRole === 'admin') {
        $stmt = $db->prepare("SELECT g.id, g.ticket_number, g.subject, g.escalated_at
            FROM grievances g 
            WHERE g.status = 'escalated'
            ORDER BY g.escalated_at DESC LIMIT 10");
        $stmt->execute();
        $escalatedGrievances = $stmt->fetchAll();
        
        foreach ($escalatedGrievances as $g) {
            $notifications[] = [
                'id' => 'g_' . $g['id'],
                'type' => 'escalation',
                'title' => 'Escalated Grievance',
                'message' => $g['ticket_number'] . ': ' . substr($g['subject'], 0, 40),
                'reference_id' => $g['id'],
                'created_at' => $g['escalated_at'],
                'is_read' => 0
            ];
        }
    }
    
    // Get announcements
    $announcementWhere = ["a.is_active = 1"];
    $announcementParams = [];
    
    if ($userRole === 'student') {
        $announcementWhere[] = "a.target_audience IN ('all', 'students', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    } else if ($userRole === 'staff') {
        // Staff sees announcements targeted to 'staff', 'all', or 'both' - NOT student-only
        $announcementWhere[] = "a.target_audience IN ('all', 'staff', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    } else if ($userRole === 'admin') {
        // Admin sees all announcements
    } else {
        // Unknown role - show nothing
        $announcementWhere[] = "1 = 0";
    }
    
    $whereClause = implode(' AND ', $announcementWhere);
    
    $sql = "SELECT a.id, a.title, a.content, a.priority, a.publisher_name, a.created_at,
            (SELECT COUNT(*) FROM announcement_reads ar 
             WHERE ar.announcement_id = a.id AND ar.user_id = ? AND ar.user_type = ?) as is_read
            FROM announcements a
            WHERE $whereClause
            ORDER BY a.created_at DESC LIMIT 10";
    
    array_unshift($announcementParams, $userId, $userRole);
    
    $stmt = $db->prepare($sql);
    $stmt->execute($announcementParams);
    $announcements = $stmt->fetchAll();
    
    foreach ($announcements as $a) {
        $notifications[] = [
            'id' => 'a_' . $a['id'],
            'type' => 'announcement',
            'title' => $a['title'],
            'message' => substr($a['content'], 0, 80) . '...',
            'reference_id' => $a['id'],
            'created_at' => $a['created_at'],
            'is_read' => (int)$a['is_read'],
            'priority' => $a['priority'],
            'publisher' => $a['publisher_name']
        ];
    }
    
    // Sort by created_at
    usort($notifications, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
    
    jsonResponse(['notifications' => array_slice($notifications, 0, 20)]);
}

function getUnreadCount() {
    $authUser = requireAuth();
    $db = getDB();
    
    $userId = $authUser['id'];
    $userRole = $authUser['role'];
    $userDept = $authUser['department'] ?? '';
    
    $count = 0;
    
    // Count unread announcements
    $announcementWhere = ["a.is_active = 1"];
    $announcementParams = [];
    
    if ($userRole === 'student') {
        $announcementWhere[] = "a.target_audience IN ('all', 'students', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    } else if ($userRole === 'staff') {
        $announcementWhere[] = "a.target_audience IN ('all', 'staff', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    }
    
    $whereClause = implode(' AND ', $announcementWhere);
    
    $sql = "SELECT COUNT(*) as unread FROM announcements a
            WHERE $whereClause
            AND NOT EXISTS (
                SELECT 1 FROM announcement_reads ar 
                WHERE ar.announcement_id = a.id AND ar.user_id = ? AND ar.user_type = ?
            )";
    
    $announcementParams[] = $userId;
    $announcementParams[] = $userRole;
    
    $stmt = $db->prepare($sql);
    $stmt->execute($announcementParams);
    $result = $stmt->fetch();
    $count = (int)$result['unread'];
    
    // Add pending grievance updates for students
    if ($userRole === 'student') {
        $stmt = $db->prepare("SELECT COUNT(*) as pending FROM grievances WHERE student_id = ? AND status NOT IN ('pending')");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        // This could be more sophisticated with a proper read tracking
    }
    
    // Add assigned grievances for staff
    if ($userRole === 'staff') {
        $stmt = $db->prepare("SELECT COUNT(*) as assigned FROM grievances WHERE assigned_to = ? AND status IN ('pending')");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        $count += (int)$result['assigned'];
    }
    
    // Add escalated grievances for admin
    if ($userRole === 'admin') {
        $stmt = $db->prepare("SELECT COUNT(*) as escalated FROM grievances WHERE status = 'escalated'");
        $stmt->execute();
        $result = $stmt->fetch();
        $count += (int)$result['escalated'];
    }
    
    jsonResponse(['count' => $count]);
}

function markAsRead() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    $notificationId = $data['notificationId'] ?? '';
    
    if (empty($notificationId)) {
        jsonResponse(['error' => 'Notification ID required'], 400);
    }
    
    // Check if it's an announcement (a_123) or grievance notification (g_123)
    if (strpos($notificationId, 'a_') === 0) {
        $announcementId = substr($notificationId, 2);
        $stmt = $db->prepare("INSERT IGNORE INTO announcement_reads (announcement_id, user_id, user_type) VALUES (?, ?, ?)");
        $stmt->execute([$announcementId, $authUser['id'], $authUser['role']]);
    }
    // Grievance notifications don't need separate tracking - they're based on status
    
    jsonResponse(['message' => 'Marked as read']);
}

function markAllAsRead() {
    $authUser = requireAuth();
    $db = getDB();
    
    $userId = $authUser['id'];
    $userRole = $authUser['role'];
    $userDept = $authUser['department'] ?? '';
    
    // Mark all announcements as read
    $announcementWhere = ["a.is_active = 1"];
    $announcementParams = [];
    
    if ($userRole === 'student') {
        $announcementWhere[] = "a.target_audience IN ('all', 'students', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    } else if ($userRole === 'staff') {
        $announcementWhere[] = "a.target_audience IN ('all', 'staff', 'both')";
        $announcementWhere[] = "(a.target_department IS NULL OR a.target_department = '' OR FIND_IN_SET(?, a.target_department) > 0)";
        $announcementParams[] = $userDept;
    }
    
    $whereClause = implode(' AND ', $announcementWhere);
    
    $sql = "SELECT id FROM announcements a WHERE $whereClause";
    $stmt = $db->prepare($sql);
    $stmt->execute($announcementParams);
    $announcements = $stmt->fetchAll();
    
    foreach ($announcements as $a) {
        $stmt = $db->prepare("INSERT IGNORE INTO announcement_reads (announcement_id, user_id, user_type) VALUES (?, ?, ?)");
        $stmt->execute([$a['id'], $userId, $userRole]);
    }
    
    jsonResponse(['message' => 'All notifications marked as read']);
}
