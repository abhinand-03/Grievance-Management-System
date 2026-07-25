<?php
/**
 * Principal Dashboard API
 * Endpoint: GET /api/principal_dashboard.php
 * Provides real-time aggregated metrics, charts, tables, activities, and alerts for Principal Dashboard.
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$authUser = requireAuth();

if ($authUser['role'] !== 'admin') {
    jsonResponse(['error' => 'Unauthorized — Principal access only'], 403);
}

$db = getDB();

// Ensure escalation columns exist in grievances table (Self-Healing Schema)
try {
    $colCheck = $db->query("SHOW COLUMNS FROM grievances LIKE 'is_escalated'");
    if (!$colCheck->fetch()) {
        $db->exec("ALTER TABLE grievances
            ADD COLUMN is_escalated        TINYINT(1)   NOT NULL DEFAULT 0 AFTER escalated_at,
            ADD COLUMN escalated_to        VARCHAR(50)  DEFAULT NULL AFTER is_escalated,
            ADD COLUMN escalation_type     ENUM('manual','automatic') DEFAULT NULL AFTER escalated_to,
            ADD COLUMN escalated_by_name   VARCHAR(255) DEFAULT NULL AFTER escalation_type,
            ADD COLUMN escalation_reason   TEXT         DEFAULT NULL AFTER escalated_by_name,
            ADD COLUMN escalation_date     DATETIME     DEFAULT NULL AFTER escalation_reason,
            ADD COLUMN pending_working_days INT          NOT NULL DEFAULT 0 AFTER escalation_date");

        $db->exec("UPDATE grievances
            SET is_escalated = 1,
                escalated_to = 'Principal',
                escalation_type = 'manual',
                escalation_date = COALESCE(escalated_at, updated_at)
            WHERE status = 'escalated' AND is_escalated = 0");
    }
} catch (Exception $e) {
    // Ignore if already existing
}

// ── Search & Filter Query Params ──

$search     = $_GET['search']     ?? null;
$department = $_GET['department'] ?? null;
$category   = $_GET['category']   ?? null;
$priority   = $_GET['priority']   ?? null;
$status     = $_GET['status']     ?? null;
$dateFrom   = $_GET['date_from']  ?? null;
$dateTo     = $_GET['date_to']    ?? null;

// Build filter conditions
$whereConditions = [];
$params = [];

if ($search) {
    $like = '%' . $search . '%';
    $whereConditions[] = '(g.student_name LIKE ? OR s.student_id LIKE ? OR g.ticket_number LIKE ? OR g.subject LIKE ?)';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

if ($department) {
    $whereConditions[] = 's.department = ?';
    $params[] = $department;
}

if ($category) {
    $whereConditions[] = 'g.category = ?';
    $params[] = $category;
}

if ($priority) {
    $whereConditions[] = 'g.priority = ?';
    $params[] = $priority;
}

if ($status) {
    $whereConditions[] = 'g.status = ?';
    $params[] = $status;
}

if ($dateFrom) {
    $whereConditions[] = 'DATE(g.created_at) >= ?';
    $params[] = $dateFrom;
}

if ($dateTo) {
    $whereConditions[] = 'DATE(g.created_at) <= ?';
    $params[] = $dateTo;
}

$whereClause = count($whereConditions) > 0 ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

// ── 1. Statistics Cards Data ──
$statsSql = "SELECT 
    COUNT(*) as totalGrievances,
    SUM(CASE WHEN g.is_escalated = 1 AND g.status = 'escalated' THEN 1 ELSE 0 END) as pendingEscalations,
    SUM(CASE WHEN g.status IN ('resolved', 'solved') AND (DATE(g.resolved_at) = CURDATE() OR DATE(g.updated_at) = CURDATE()) THEN 1 ELSE 0 END) as resolvedToday,
    SUM(CASE WHEN g.status = 'in_review' THEN 1 ELSE 0 END) as underReview,
    SUM(CASE WHEN g.status IN ('rejected', 'denied') THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN g.status NOT IN ('resolved', 'solved', 'considered', 'denied', 'rejected') 
             AND (g.is_escalated = 1 AND g.escalation_type = 'automatic' OR TIMESTAMPDIFF(DAY, g.created_at, NOW()) >= 7) THEN 1 ELSE 0 END) as pending7Days,
    AVG(CASE WHEN g.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, g.created_at, g.resolved_at) ELSE NULL END) as avgResolutionHours
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $whereClause";

$stmt = $db->prepare($statsSql);
$stmt->execute($params);
$rawStats = $stmt->fetch();

$avgHours = (float)($rawStats['avgResolutionHours'] ?? 0);
$avgResolutionTimeFormatted = $avgHours > 0 
    ? ($avgHours >= 24 ? round($avgHours / 24, 1) . ' days' : round($avgHours, 1) . ' hours')
    : '0 hours';

$stats = [
    'totalGrievances'       => (int)($rawStats['totalGrievances'] ?? 0),
    'pendingEscalations'    => (int)($rawStats['pendingEscalations'] ?? 0),
    'resolvedToday'         => (int)($rawStats['resolvedToday'] ?? 0),
    'underReview'           => (int)($rawStats['underReview'] ?? 0),
    'rejected'              => (int)($rawStats['rejected'] ?? 0),
    'pending7Days'          => (int)($rawStats['pending7Days'] ?? 0),
    'averageResolutionHours'=> round($avgHours, 1),
    'averageResolutionTime' => $avgResolutionTimeFormatted,
];

// ── 2. Top 5 Departments with Highest Complaints ──
$deptSql = "SELECT 
    COALESCE(s.department, 'Unassigned') as department,
    COUNT(*) as count
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $whereClause
    GROUP BY COALESCE(s.department, 'Unassigned')
    ORDER BY count DESC
    LIMIT 5";
$stmt = $db->prepare($deptSql);
$stmt->execute($params);
$departmentStats = [];
foreach ($stmt->fetchAll() as $row) {
    $departmentStats[] = [
        'department' => $row['department'],
        'count'      => (int)$row['count'],
    ];
}

// ── 3. Monthly Trend (Bar Chart) ──
$monthlySql = "SELECT 
    DATE_FORMAT(g.created_at, '%b') as month,
    DATE_FORMAT(g.created_at, '%Y-%m') as yearMonth,
    COUNT(*) as count
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $whereClause
    GROUP BY yearMonth, month
    ORDER BY yearMonth ASC
    LIMIT 6";
$stmt = $db->prepare($monthlySql);
$stmt->execute($params);
$monthlyStats = [];
foreach ($stmt->fetchAll() as $row) {
    $monthlyStats[] = [
        'month' => $row['month'],
        'count' => (int)$row['count'],
    ];
}

// ── 4. Category Breakdown (Donut Chart) ──
$categorySql = "SELECT 
    g.category,
    COUNT(*) as count
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $whereClause
    GROUP BY g.category";
$stmt = $db->prepare($categorySql);
$stmt->execute($params);
$categoryStats = [];
foreach ($stmt->fetchAll() as $row) {
    $categoryStats[] = [
        'category' => $row['category'],
        'count'    => (int)$row['count'],
    ];
}

// ── 5. Status Distribution (Pie Chart) ──
$statusSql = "SELECT 
    g.status,
    COUNT(*) as count
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $whereClause
    GROUP BY g.status";
$stmt = $db->prepare($statusSql);
$stmt->execute($params);
$statusDistribution = [];
foreach ($stmt->fetchAll() as $row) {
    $statusDistribution[] = [
        'status' => $row['status'],
        'count'  => (int)$row['count'],
    ];
}

// ── 6. Recent Escalations (Latest 10) ──
$escWhere = $whereConditions;
$escWhere[] = "g.is_escalated = 1";
$escWhereClause = 'WHERE ' . implode(' AND ', $escWhere);

$escSql = "SELECT 
    g.*,
    s.student_id AS register_number,
    s.department AS student_department
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $escWhereClause
    ORDER BY g.escalation_date DESC, g.created_at DESC
    LIMIT 10";
$stmt = $db->prepare($escSql);
$stmt->execute($params);
$recentEscalations = $stmt->fetchAll();

// ── 7. Recently Resolved (Latest 10) ──
$resWhere = $whereConditions;
$resWhere[] = "g.status IN ('resolved', 'solved', 'considered', 'denied')";
$resWhereClause = 'WHERE ' . implode(' AND ', $resWhere);

$resSql = "SELECT 
    g.*,
    s.student_id AS register_number,
    s.department AS student_department,
    (SELECT changed_by_name FROM status_logs WHERE grievance_id = g.id AND to_status IN ('resolved', 'solved', 'considered', 'denied') ORDER BY created_at DESC LIMIT 1) as resolved_by_name
    FROM grievances g
    LEFT JOIN students s ON s.id = g.student_id
    $resWhereClause
    ORDER BY g.resolved_at DESC, g.updated_at DESC
    LIMIT 10";
$stmt = $db->prepare($resSql);
$stmt->execute($params);
$recentResolved = $stmt->fetchAll();

// ── 8. Recent Activities (Timeline - Latest 15) ──
$actSql = "SELECT 
    l.id,
    l.grievance_id,
    g.ticket_number,
    g.subject as grievance_subject,
    l.from_status,
    l.to_status,
    l.changed_by_name,
    l.changed_by_type,
    l.reason,
    l.created_at
    FROM status_logs l
    JOIN grievances g ON g.id = l.grievance_id
    ORDER BY l.created_at DESC
    LIMIT 15";
$stmt = $db->prepare($actSql);
$stmt->execute();
$recentActivities = $stmt->fetchAll();

// ── 9. Notifications / Alerts ──
$notifSql = "SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0";
$stmt = $db->prepare($notifSql);
$stmt->execute([$authUser['id']]);
$unreadCount = (int)($stmt->fetch()['unreadCount'] ?? 0);

jsonResponse([
    'stats'               => $stats,
    'departmentStats'     => $departmentStats,
    'monthlyStats'        => $monthlyStats,
    'categoryStats'       => $categoryStats,
    'statusDistribution'  => $statusDistribution,
    'recentEscalations'   => $recentEscalations,
    'recentResolved'      => $recentResolved,
    'recentActivities'    => $recentActivities,
    'unreadNotifications' => $unreadCount,
    'timestamp'           => date('Y-m-d H:i:s'),
]);
