<?php
/**
 * Grievances API
 * Handles CRUD operations for grievances
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getGrievance($id);
        } else if ($action === 'stats') {
            getStats();
        } else {
            getGrievances();
        }
        break;
        
    case 'POST':
        createGrievance();
        break;
        
    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'Grievance ID required'], 400);
        }
        updateGrievance($id);
        break;
        
    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'Grievance ID required'], 400);
        }
        deleteGrievance($id);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getGrievances() {
    $authUser = requireAuth();
    $db = getDB();
    
    $status = $_GET['status'] ?? null;
    $category = $_GET['category'] ?? null;
    $priority = $_GET['priority'] ?? null;
    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 10);
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $params = [];
    
    // Filter by user role
    if ($authUser['role'] === 'student') {
        $where[] = "g.student_id = ?";
        $params[] = $authUser['id'];
    } else if ($authUser['role'] === 'admin') {
        // Admin (Principal) sees escalated grievances and those they've already processed
        $where[] = "(g.status = 'escalated' OR g.status IN ('solved', 'considered', 'denied'))";
    } else if ($authUser['role'] === 'staff') {
        // Staff sees ONLY grievances assigned to them or matching their specific department/category
        $staffDept = $authUser['department'] ?? '';
        
        // Map departments to categories they handle
        $deptToCategoryMapping = [
            'Library' => 'library',
            'Mens Hostel' => 'mens_hostel',
            'Womens Hostel' => 'womens_hostel',
            'Canteen' => 'canteen'
        ];
        
        $mappedCategory = $deptToCategoryMapping[$staffDept] ?? null;
        
        if ($mappedCategory) {
            // Staff from specific departments see ONLY grievances assigned to them OR in their category
            $where[] = "(g.assigned_to = ? OR g.category = ?)";
            $params[] = $authUser['id'];
            $params[] = $mappedCategory;
        } else {
            // HOD staff see ONLY grievances assigned to them
            // They receive academics grievances from students in their department via auto-assignment
            $where[] = "g.assigned_to = ?";
            $params[] = $authUser['id'];
        }
    }
    
    if ($status) {
        $where[] = "g.status = ?";
        $params[] = $status;
    }
    
    if ($category) {
        $where[] = "g.category = ?";
        $params[] = $category;
    }
    
    if ($priority) {
        $where[] = "g.priority = ?";
        $params[] = $priority;
    }
    
    $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM grievances g $whereClause";
    $stmt = $db->prepare($countSql);
    $stmt->execute($params);
    $total = $stmt->fetch()['total'];
    
    // Determine sort order based on user role
    // Admin sees escalated grievances sorted by priority (critical first) then by escalation date (oldest first)
    if ($authUser['role'] === 'admin') {
        $orderBy = "ORDER BY FIELD(g.priority, 'critical', 'high', 'medium', 'low'), g.escalated_at ASC, g.created_at ASC";
    } else {
        $orderBy = "ORDER BY g.created_at DESC";
    }
    
    // Get grievances
    $sql = "SELECT g.*, 
            (SELECT COUNT(*) FROM comments c WHERE c.grievance_id = g.id) as comment_count,
            (SELECT COUNT(*) FROM attachments a WHERE a.grievance_id = g.id) as attachment_count
            FROM grievances g 
            $whereClause 
            $orderBy 
            LIMIT $limit OFFSET $offset";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $grievances = $stmt->fetchAll();
    
    jsonResponse([
        'grievances' => $grievances,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'totalPages' => ceil($total / $limit)
        ]
    ]);
}

function getGrievance($id) {
    $authUser = requireAuth();
    $db = getDB();
    
    // Get grievance
    $stmt = $db->prepare("SELECT * FROM grievances WHERE id = ?");
    $stmt->execute([$id]);
    $grievance = $stmt->fetch();
    
    if (!$grievance) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    
    // Check access
    if ($authUser['role'] === 'student' && $grievance['student_id'] != $authUser['id']) {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    // Get attachments
    $stmt = $db->prepare("SELECT * FROM attachments WHERE grievance_id = ?");
    $stmt->execute([$id]);
    $grievance['attachments'] = $stmt->fetchAll();
    
    // Get comments
    $stmt = $db->prepare("SELECT * FROM comments WHERE grievance_id = ? ORDER BY created_at ASC");
    $stmt->execute([$id]);
    $grievance['comments'] = $stmt->fetchAll();
    
    // Get status logs
    $stmt = $db->prepare("SELECT * FROM status_logs WHERE grievance_id = ? ORDER BY created_at ASC");
    $stmt->execute([$id]);
    $grievance['statusLogs'] = $stmt->fetchAll();
    
    jsonResponse($grievance);
}

function createGrievance() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    // Only students can create grievances
    // Check both user_type and role to be safe
    $userType = $authUser['user_type'] ?? $authUser['role'] ?? '';
    $userRole = $authUser['role'] ?? '';
    
    if ($userType !== 'student' && $userRole !== 'student') {
        jsonResponse(['error' => 'Only students can submit grievances. Please login as a student.'], 403);
    }
    
    $category = $data['category'] ?? '';
    $priority = $data['priority'] ?? 'medium';
    $subject = $data['subject'] ?? '';
    $description = $data['description'] ?? '';
    $isAnonymous = $data['isAnonymous'] ?? false;
    
    if (empty($category) || empty($subject) || empty($description)) {
        jsonResponse(['error' => 'Category, subject, and description are required'], 400);
    }
    
    // Generate ticket number
    $year = date('Y');
    $stmt = $db->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(ticket_number, '-', -1) AS UNSIGNED)) as max_num 
                          FROM grievances WHERE ticket_number LIKE ?");
    $stmt->execute(["GRV-$year-%"]);
    $result = $stmt->fetch();
    $nextNum = ($result['max_num'] ?? 0) + 1;
    $ticketNumber = sprintf("GRV-%s-%03d", $year, $nextNum);
    
    $studentName = $isAnonymous ? 'Anonymous' : $authUser['name'];
    $studentEmail = $isAnonymous ? 'hidden@university.edu' : $authUser['email'];
    
    // Auto-assign to appropriate faculty based on category
    $assignedTo = null;
    $assignedToName = null;
    
    // Map category to staff department
    $categoryToDepartment = [
        'library' => 'Library',
        'mens_hostel' => 'Mens Hostel',
        'womens_hostel' => 'Womens Hostel',
        'canteen' => 'Canteen'
    ];
    
    if ($category === 'academics') {
        // For academics, assign to the HOD of the student's department
        $studentDepartment = $authUser['department'] ?? '';
        if (!empty($studentDepartment)) {
            $stmt = $db->prepare("SELECT id, name FROM staff WHERE department = ? AND is_approved = 1 AND designation LIKE '%Head%' ORDER BY id ASC LIMIT 1");
            $stmt->execute([$studentDepartment]);
            $staff = $stmt->fetch();
            if ($staff) {
                $assignedTo = $staff['id'];
                $assignedToName = $staff['name'];
            }
        }
    } else if (isset($categoryToDepartment[$category])) {
        // For other categories, find staff from the corresponding department
        $targetDepartment = $categoryToDepartment[$category];
        $stmt = $db->prepare("SELECT id, name FROM staff WHERE department = ? AND is_approved = 1 ORDER BY id ASC LIMIT 1");
        $stmt->execute([$targetDepartment]);
        $staff = $stmt->fetch();
        if ($staff) {
            $assignedTo = $staff['id'];
            $assignedToName = $staff['name'];
        }
    }
    
    $stmt = $db->prepare("INSERT INTO grievances 
        (ticket_number, student_id, student_name, student_email, category, priority, status, subject, description, is_anonymous, assigned_to, assigned_to_name) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)");
    $stmt->execute([
        $ticketNumber, 
        $authUser['id'], 
        $studentName, 
        $studentEmail, 
        $category, 
        $priority, 
        $subject, 
        $description, 
        $isAnonymous ? 1 : 0,
        $assignedTo,
        $assignedToName
    ]);
    
    $grievanceId = $db->lastInsertId();
    
    // Log initial status
    $stmt = $db->prepare("INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by, changed_by_type, changed_by_name) 
                          VALUES (?, NULL, 'pending', ?, 'student', ?)");
    $stmt->execute([$grievanceId, $authUser['id'], $studentName]);
    
    // Log auto-assignment if assigned
    if ($assignedTo) {
        $stmt = $db->prepare("INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by_name, reason) 
                              VALUES (?, 'pending', 'pending', 'System', ?)");
        $stmt->execute([$grievanceId, "Auto-assigned to $assignedToName based on category"]);
    }
    
    // Auto-escalate critical
    if ($priority === 'critical') {
        $stmt = $db->prepare("UPDATE grievances SET status = 'escalated', escalated_at = NOW() WHERE id = ?");
        $stmt->execute([$grievanceId]);
        
        $stmt = $db->prepare("INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by_name, reason) 
                              VALUES (?, 'pending', 'escalated', 'System', 'Critical priority - auto-escalated to Admin')");
        $stmt->execute([$grievanceId]);
    }
    
    // Return created grievance
    $stmt = $db->prepare("SELECT * FROM grievances WHERE id = ?");
    $stmt->execute([$grievanceId]);
    $grievance = $stmt->fetch();
    
    jsonResponse($grievance, 201);
}

function updateGrievance($id) {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    // Get current grievance
    $stmt = $db->prepare("SELECT * FROM grievances WHERE id = ?");
    $stmt->execute([$id]);
    $grievance = $stmt->fetch();
    
    if (!$grievance) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    
    // Check authorization
    if ($authUser['role'] === 'student') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $updates = [];
    $params = [];
    
    if (isset($data['status'])) {
        $oldStatus = $grievance['status'];
        $newStatus = $data['status'];
        $reason = $data['reason'] ?? null;
        
        $updates[] = "status = ?";
        $params[] = $newStatus;
        
        if ($newStatus === 'resolved' || $newStatus === 'solved') {
            $updates[] = "resolved_at = NOW()";
        }
        if ($newStatus === 'escalated') {
            $updates[] = "escalated_at = NOW()";
            $reason = $reason ?? 'Forwarded to Principal by ' . $authUser['name'];
        }
        
        // Auto-assign staff when they take action
        if ($authUser['role'] === 'staff' && !$grievance['assigned_to']) {
            $updates[] = "assigned_to = ?";
            $params[] = $authUser['id'];
            $updates[] = "assigned_to_name = ?";
            $params[] = $authUser['name'];
        }
        
        // Determine user type for logging
        $changedByType = $authUser['role'] === 'admin' ? 'admin' : 'staff';
        
        // Log status change with user type
        $stmt = $db->prepare("INSERT INTO status_logs (grievance_id, from_status, to_status, changed_by, changed_by_type, changed_by_name, reason) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $oldStatus, $newStatus, $authUser['id'], $changedByType, $authUser['name'], $reason]);
    }
    
    if (isset($data['assignedTo'])) {
        $updates[] = "assigned_to = ?";
        $params[] = $data['assignedTo'];
        
        // Get assigned user name
        $stmt = $db->prepare("SELECT name FROM users WHERE id = ?");
        $stmt->execute([$data['assignedTo']]);
        $assignedUser = $stmt->fetch();
        
        $updates[] = "assigned_to_name = ?";
        $params[] = $assignedUser['name'] ?? null;
    }
    
    if (isset($data['priority'])) {
        $updates[] = "priority = ?";
        $params[] = $data['priority'];
    }
    
    if (count($updates) > 0) {
        $params[] = $id;
        $sql = "UPDATE grievances SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }
    
    // Return updated grievance
    $stmt = $db->prepare("SELECT * FROM grievances WHERE id = ?");
    $stmt->execute([$id]);
    $grievance = $stmt->fetch();
    
    jsonResponse($grievance);
}

function deleteGrievance($id) {
    $authUser = requireAuth();
    
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("DELETE FROM grievances WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    
    jsonResponse(['message' => 'Grievance deleted successfully']);
}

function getStats() {
    $authUser = requireAuth();
    $db = getDB();
    
    $where = "";
    $params = [];
    
    if ($authUser['role'] === 'student') {
        $where = "WHERE student_id = ?";
        $params[] = $authUser['id'];
    } else if ($authUser['role'] === 'admin') {
        // Admin (Principal) stats for escalated and processed grievances
        $where = "WHERE status IN ('escalated', 'solved', 'considered', 'denied')";
    } else if ($authUser['role'] === 'staff') {
        // Staff sees ONLY grievances assigned to them or matching their specific department/category
        $staffDept = $authUser['department'] ?? '';
        
        // Map departments to categories they handle
        $deptToCategoryMapping = [
            'Library' => 'library',
            'Mens Hostel' => 'mens_hostel',
            'Womens Hostel' => 'womens_hostel',
            'Canteen' => 'canteen'
        ];
        
        $mappedCategory = $deptToCategoryMapping[$staffDept] ?? null;
        
        if ($mappedCategory) {
            // Staff from specific departments see ONLY grievances assigned to them OR in their category
            $where = "WHERE (assigned_to = ? OR category = ?)";
            $params[] = $authUser['id'];
            $params[] = $mappedCategory;
        } else {
            // HOD staff see ONLY grievances assigned to them
            $where = "WHERE assigned_to = ?";
            $params[] = $authUser['id'];
        }
    }
    
    // Get main stats
    $sql = "SELECT 
        COUNT(*) as totalGrievances,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as inReview,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) as solved,
        SUM(CASE WHEN status = 'considered' THEN 1 ELSE 0 END) as considered,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied,
        AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) ELSE NULL END) as avgResolutionTime
        FROM grievances $where";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetch();
    
    // Convert to integers
    $stats['totalGrievances'] = (int)($stats['totalGrievances'] ?? 0);
    $stats['pending'] = (int)($stats['pending'] ?? 0);
    $stats['inReview'] = (int)($stats['inReview'] ?? 0);
    $stats['resolved'] = (int)($stats['resolved'] ?? 0);
    $stats['rejected'] = (int)($stats['rejected'] ?? 0);
    $stats['escalated'] = (int)($stats['escalated'] ?? 0);
    $stats['solved'] = (int)($stats['solved'] ?? 0);
    $stats['considered'] = (int)($stats['considered'] ?? 0);
    $stats['denied'] = (int)($stats['denied'] ?? 0);
    $stats['avgResolutionTime'] = (float)($stats['avgResolutionTime'] ?? 0);
    
    // Category breakdown
    $sql = "SELECT category, COUNT(*) as count FROM grievances $where GROUP BY category";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $categoryBreakdown = [];
    foreach ($stmt->fetchAll() as $row) {
        $categoryBreakdown[$row['category']] = (int)$row['count'];
    }
    $stats['categoryBreakdown'] = $categoryBreakdown;
    
    // Priority breakdown
    $sql = "SELECT priority, COUNT(*) as count FROM grievances $where GROUP BY priority";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $priorityBreakdown = [];
    foreach ($stmt->fetchAll() as $row) {
        $priorityBreakdown[$row['priority']] = (int)$row['count'];
    }
    $stats['priorityBreakdown'] = $priorityBreakdown;
    
    // Monthly trend
    $sql = "SELECT DATE_FORMAT(created_at, '%b') as month, COUNT(*) as count 
            FROM grievances $where 
            GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
            ORDER BY created_at DESC LIMIT 6";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $stats['monthlyTrend'] = $stmt->fetchAll();
    
    jsonResponse($stats);
}
