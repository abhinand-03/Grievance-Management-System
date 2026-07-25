<?php
/**
 * Escalations API
 * Handles manual/automatic escalation for the Principal dashboard.
 *
 * Endpoints:
 *   GET  /escalations.php                       → list all escalated grievances (admin)
 *   GET  /escalations.php?action=auto-escalate  → run auto-escalation check (admin)
 *   GET  /escalations.php?action=pending-overdue→ list overdue not-yet-escalated (admin)
 *   POST /escalations.php?id=X                  → manually escalate grievance X (staff)
 *   PUT  /escalations.php?id=X                  → principal updates status on grievance X (admin)
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';
$id     = $_GET['id']     ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getSingleEscalation($id);
        } elseif ($action === 'auto-escalate') {
            runAutoEscalate();
        } elseif ($action === 'pending-overdue') {
            getPendingOverdue();
        } else {
            getEscalations();
        }
        break;

    case 'POST':
        if (!$id) jsonResponse(['error' => 'Grievance ID required'], 400);
        manualEscalate($id);
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error' => 'Grievance ID required'], 400);
        updateEscalation($id);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count working days (Mon–Fri) between two datetime strings.
 * The start day is included; the end day is NOT (counts elapsed days).
 *
 * Example: submitted Mon 04-Aug, today Tue 12-Aug  → 7 working days.
 *
 * @param string $startDate  e.g. '2026-08-01 09:00:00'
 * @param string $endDate    e.g. '2026-08-11 14:00:00'
 * @return int
 */
function countWorkingDays(string $startDate, string $endDate): int {
    try {
        $start   = new DateTime($startDate);
        $end     = new DateTime($endDate);
        $count   = 0;
        $current = clone $start;

        while ($current < $end) {
            $dow = (int) $current->format('N'); // 1=Mon, 7=Sun
            if ($dow <= 5) {                    // Monday – Friday only
                $count++;
            }
            $current->modify('+1 day');
        }
        return $count;
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Build a standardised escalation row by hydrating snake_case API fields
 * and adding a live `pending_working_days` value.
 */
function hydrateEscalation(array $g): array {
    $g['pending_working_days'] = countWorkingDays($g['created_at'], date('Y-m-d H:i:s'));
    return $g;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Single escalated grievance
// ─────────────────────────────────────────────────────────────────────────────
function getSingleEscalation($id) {
    $authUser = requireAuth();
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized — Principal access only'], 403);
    }

    $db   = getDB();
    $stmt = $db->prepare(
        "SELECT g.*, s.student_id AS register_number, s.department AS student_department
         FROM grievances g
         LEFT JOIN students s ON s.id = g.student_id
         WHERE g.id = ?"
    );
    $stmt->execute([$id]);
    $g = $stmt->fetch();

    if (!$g) jsonResponse(['error' => 'Grievance not found'], 404);

    jsonResponse(hydrateEscalation($g));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — List all escalated grievances (admin only)
//
// Query params (all optional):
//   search, department, category, status, priority,
//   escalation_type, date_from, date_to, page, limit
// ─────────────────────────────────────────────────────────────────────────────
function getEscalations() {
    $authUser = requireAuth();
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized — Principal access only'], 403);
    }

    $db = getDB();

    // --- Build WHERE clause ---
    $where  = ['g.is_escalated = 1'];
    $params = [];

    $search         = $_GET['search']          ?? null;
    $department     = $_GET['department']      ?? null;
    $category       = $_GET['category']        ?? null;
    $status         = $_GET['status']          ?? null;
    $priority       = $_GET['priority']        ?? null;
    $escalationType = $_GET['escalation_type'] ?? null;
    $dateFrom       = $_GET['date_from']       ?? null;
    $dateTo         = $_GET['date_to']         ?? null;
    $page           = max(1, (int) ($_GET['page']  ?? 1));
    $limit          = min(200, max(1, (int) ($_GET['limit'] ?? 100)));
    $offset         = ($page - 1) * $limit;

    if ($search) {
        $like     = '%' . $search . '%';
        $where[]  = '(g.student_name LIKE ? OR s.student_id LIKE ? OR g.ticket_number LIKE ?)';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    if ($department)     { $where[] = 's.department = ?';        $params[] = $department; }
    if ($category)       { $where[] = 'g.category = ?';          $params[] = $category; }
    if ($status)         { $where[] = 'g.status = ?';            $params[] = $status; }
    if ($priority)       { $where[] = 'g.priority = ?';          $params[] = $priority; }
    if ($escalationType) { $where[] = 'g.escalation_type = ?';   $params[] = $escalationType; }
    if ($dateFrom)       { $where[] = 'DATE(g.escalation_date) >= ?'; $params[] = $dateFrom; }
    if ($dateTo)         { $where[] = 'DATE(g.escalation_date) <= ?'; $params[] = $dateTo; }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    // Total count
    $stmt = $db->prepare(
        "SELECT COUNT(*) AS total
         FROM grievances g
         LEFT JOIN students s ON s.id = g.student_id
         $whereClause"
    );
    $stmt->execute($params);
    $total = (int) $stmt->fetch()['total'];

    // Fetch paginated rows
    $sql = "SELECT
                g.*,
                s.student_id AS register_number,
                s.department AS student_department
            FROM grievances g
            LEFT JOIN students s ON s.id = g.student_id
            $whereClause
            ORDER BY
                FIELD(g.priority, 'critical', 'high', 'medium', 'low'),
                g.escalation_date ASC,
                g.created_at ASC
            LIMIT $limit OFFSET $offset";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Hydrate with live working-days count
    $escalations = array_map('hydrateEscalation', $rows);

    // Summary counts for stat cards
    $summaryStmt = $db->prepare(
        "SELECT
            COUNT(*) AS total,
            SUM(escalation_type = 'manual')    AS manual_count,
            SUM(escalation_type = 'automatic') AS auto_count,
            SUM(priority = 'critical')         AS critical_count
         FROM grievances g
         LEFT JOIN students s ON s.id = g.student_id
         $whereClause"
    );
    $summaryStmt->execute($params);
    $summary = $summaryStmt->fetch();

    jsonResponse([
        'escalations' => $escalations,
        'summary'     => [
            'total'          => (int) ($summary['total']          ?? 0),
            'manual_count'   => (int) ($summary['manual_count']   ?? 0),
            'auto_count'     => (int) ($summary['auto_count']     ?? 0),
            'critical_count' => (int) ($summary['critical_count'] ?? 0),
        ],
        'pagination'  => [
            'page'       => $page,
            'limit'      => $limit,
            'total'      => $total,
            'totalPages' => (int) ceil($total / $limit),
        ],
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ?action=auto-escalate — Run automatic escalation check (admin / system)
//
// Finds every grievance that:
//   • is NOT in a terminal status (resolved/solved/considered/denied/rejected)
//   • has NOT already been escalated (is_escalated = 0)
//   • has been pending for >= 7 WORKING DAYS since submission
//
// Sets: status='escalated', is_escalated=1, escalation_type='automatic', …
// Idempotent: the WHERE clause prevents double-escalation.
// ─────────────────────────────────────────────────────────────────────────────
function runAutoEscalate() {
    $authUser = requireAuth();
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }

    $db = getDB();

    // Fetch all candidates (not yet escalated, not terminal)
    $stmt = $db->prepare(
        "SELECT id, created_at FROM grievances
         WHERE is_escalated = 0
           AND status NOT IN ('resolved', 'solved', 'considered', 'denied', 'rejected')"
    );
    $stmt->execute();
    $candidates = $stmt->fetchAll();

    $today       = date('Y-m-d H:i:s');
    $threshold   = 7;
    $escalated   = 0;
    $skipped     = 0;

    foreach ($candidates as $g) {
        $workingDays = countWorkingDays($g['created_at'], $today);

        if ($workingDays < $threshold) {
            $skipped++;
            continue;
        }

        // Escalate — the WHERE guard prevents double-escalation even on concurrent calls
        $upd = $db->prepare(
            "UPDATE grievances SET
                status               = 'escalated',
                is_escalated         = 1,
                escalated_to         = 'Principal',
                escalation_type      = 'automatic',
                escalated_by_name    = 'System',
                escalation_reason    = 'Not resolved within 7 working days',
                escalation_date      = NOW(),
                pending_working_days = ?,
                escalated_at         = COALESCE(escalated_at, NOW())
             WHERE id = ? AND is_escalated = 0"
        );
        $upd->execute([$workingDays, $g['id']]);

        if ($upd->rowCount() > 0) {
            // Append to status history
            $db->prepare(
                "INSERT INTO status_logs
                    (grievance_id, from_status, to_status, changed_by_name, reason)
                 VALUES (?, 'pending', 'escalated', 'System',
                         'Auto-escalated: not resolved within 7 working days')"
            )->execute([$g['id']]);

            $escalated++;
        }
    }

    jsonResponse([
        'message'   => "$escalated grievance(s) auto-escalated; $skipped below threshold.",
        'escalated' => $escalated,
        'skipped'   => $skipped,
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ?action=pending-overdue — List overdue grievances not yet escalated (admin)
// ─────────────────────────────────────────────────────────────────────────────
function getPendingOverdue() {
    $authUser = requireAuth();
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }

    $db = getDB();

    $stmt = $db->prepare(
        "SELECT g.*, s.student_id AS register_number, s.department AS student_department
         FROM grievances g
         LEFT JOIN students s ON s.id = g.student_id
         WHERE g.is_escalated = 0
           AND g.status NOT IN ('resolved', 'solved', 'considered', 'denied', 'rejected')
         ORDER BY g.created_at ASC"
    );
    $stmt->execute();
    $candidates = $stmt->fetchAll();

    $today   = date('Y-m-d H:i:s');
    $overdue = [];

    foreach ($candidates as $g) {
        $days = countWorkingDays($g['created_at'], $today);
        if ($days >= 7) {
            $g['pending_working_days'] = $days;
            $overdue[]                 = $g;
        }
    }

    jsonResponse(['overdue' => $overdue, 'count' => count($overdue)]);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST ?id=X — Staff manually escalates a grievance to the Principal
//
// Body: { "reason": "…" }
// ─────────────────────────────────────────────────────────────────────────────
function manualEscalate($id) {
    $authUser = requireAuth();

    // Only staff/HOD can escalate manually
    if ($authUser['role'] !== 'staff') {
        jsonResponse(['error' => 'Only staff/HOD can manually escalate grievances'], 403);
    }

    $db     = getDB();
    $data   = getRequestBody();
    $reason = trim($data['reason'] ?? '');

    if (empty($reason)) {
        jsonResponse(['error' => 'Escalation reason is required'], 400);
    }

    // Load current grievance
    $stmt = $db->prepare('SELECT * FROM grievances WHERE id = ?');
    $stmt->execute([$id]);
    $grievance = $stmt->fetch();

    if (!$grievance) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    if ($grievance['is_escalated']) {
        jsonResponse(['error' => 'This grievance has already been escalated to the Principal'], 409);
    }
    if (in_array($grievance['status'], ['resolved', 'solved', 'considered', 'denied', 'rejected'])) {
        jsonResponse(['error' => 'Cannot escalate a grievance that is already resolved or closed'], 422);
    }

    $today       = date('Y-m-d H:i:s');
    $workingDays = countWorkingDays($grievance['created_at'], $today);

    // Update grievance record
    $db->prepare(
        "UPDATE grievances SET
            status               = 'escalated',
            is_escalated         = 1,
            escalated_to         = 'Principal',
            escalation_type      = 'manual',
            escalated_by_name    = ?,
            escalation_reason    = ?,
            escalation_date      = NOW(),
            pending_working_days = ?,
            escalated_at         = COALESCE(escalated_at, NOW())
         WHERE id = ?"
    )->execute([$authUser['name'], $reason, $workingDays, $id]);

    // Log the status change
    $db->prepare(
        "INSERT INTO status_logs
            (grievance_id, from_status, to_status, changed_by, changed_by_type, changed_by_name, reason)
         VALUES (?, ?, 'escalated', ?, 'staff', ?, ?)"
    )->execute([
        $id,
        $grievance['status'],
        $authUser['id'],
        $authUser['name'],
        "Escalated to Principal: $reason",
    ]);

    // Return the updated grievance
    $stmt = $db->prepare('SELECT * FROM grievances WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(hydrateEscalation($stmt->fetch()));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT ?id=X — Principal updates status on an escalated grievance
//
// Body: { "status": "solved"|"considered"|"denied", "reason": "…" }
// ─────────────────────────────────────────────────────────────────────────────
function updateEscalation($id) {
    $authUser = requireAuth();
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized — Principal access only'], 403);
    }

    $db   = getDB();
    $data = getRequestBody();

    $stmt = $db->prepare('SELECT * FROM grievances WHERE id = ?');
    $stmt->execute([$id]);
    $grievance = $stmt->fetch();

    if (!$grievance) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }

    $allowedStatuses = ['solved', 'considered', 'denied'];
    $newStatus       = $data['status'] ?? null;
    $reason          = trim($data['reason'] ?? '');

    if (!$newStatus || !in_array($newStatus, $allowedStatuses)) {
        jsonResponse([
            'error' => 'Invalid status. Allowed values: ' . implode(', ', $allowedStatuses),
        ], 400);
    }

    $updates = ['status = ?'];
    $params  = [$newStatus];

    if ($newStatus === 'solved') {
        $updates[] = 'resolved_at = NOW()';
    }

    $params[] = $id;
    $db->prepare(
        'UPDATE grievances SET ' . implode(', ', $updates) . ' WHERE id = ?'
    )->execute($params);

    // Log the decision
    $db->prepare(
        "INSERT INTO status_logs
            (grievance_id, from_status, to_status, changed_by, changed_by_type, changed_by_name, reason)
         VALUES (?, ?, ?, ?, 'admin', ?, ?)"
    )->execute([
        $id,
        $grievance['status'],
        $newStatus,
        $authUser['id'],
        $authUser['name'],
        $reason ?: null,
    ]);

    $stmt = $db->prepare('SELECT * FROM grievances WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(hydrateEscalation($stmt->fetch()));
}
