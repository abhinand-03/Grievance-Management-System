<?php
/**
 * Users API
 * Handles user management (staff/admin only)
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;
$role = $_GET['role'] ?? null;

switch ($method) {
    case 'GET':
        if ($action === 'principal-invite') {
            getPrincipalInvite();
        } else if ($action === 'pending-staff') {
            getPendingStaff();
        } else if ($action === 'staff') {
            getStaffList();
        } else if ($id) {
            getUser($id, $role);
        } else {
            getUsers($role);
        }
        break;
    
    case 'POST':
        if ($action === 'profile-update') {
            if (!$id) {
                jsonResponse(['error' => 'User ID required'], 400);
            }
            updateUser($id);
        } else
        if ($action === 'change-password') {
            changePassword();
        } else if ($action === 'transfer-principal') {
            initiatePrincipalTransfer();
        } else if ($action === 'assign-temporary-principal') {
            assignTemporaryPrincipal();
        } else if ($action === 'principal-invite') {
            completePrincipalInvite();
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
        break;
        
    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        if ($action === 'approve') {
            approveStaff($id);
        } else if ($action === 'reject') {
            rejectStaff($id);
        } else {
            updateUser($id);
        }
        break;
        
    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        deleteStaff($id);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

/**
 * Get pending staff registrations (only for admin/principal)
 */
function getPendingStaff() {
    $authUser = requireAuth();
    
    // Only admin can view pending approvals
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized - Only Principal can manage staff approvals'], 403);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, designation, is_approved, created_at 
                          FROM staff 
                          WHERE is_approved = 0 
                          ORDER BY created_at ASC");
    $stmt->execute();
    $staff = $stmt->fetchAll();
    
    jsonResponse([
        'pending_staff' => $staff,
        'count' => count($staff)
    ]);
}

/**
 * Get all staff list (only for admin/principal)
 */
function getStaffList() {
    $authUser = requireAuth();
    
    // Only admin can view staff list
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, designation, is_approved, created_at 
                          FROM staff 
                          ORDER BY is_approved ASC, created_at DESC");
    $stmt->execute();
    $staff = $stmt->fetchAll();
    
    jsonResponse([
        'staff' => $staff,
        'count' => count($staff)
    ]);
}

/**
 * Approve a staff registration
 */
function approveStaff($id) {
    $authUser = requireAuth();
    
    // Only admin can approve staff
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized - Only Principal can approve staff'], 403);
    }
    
    $db = getDB();
    
    // Check if staff exists
    $stmt = $db->prepare("SELECT * FROM staff WHERE id = ?");
    $stmt->execute([$id]);
    $staff = $stmt->fetch();
    
    if (!$staff) {
        jsonResponse(['error' => 'Staff not found'], 404);
    }
    
    if ($staff['is_approved']) {
        jsonResponse(['error' => 'Staff is already approved'], 400);
    }
    
    // Approve the staff
    $stmt = $db->prepare("UPDATE staff SET is_approved = 1 WHERE id = ?");
    $stmt->execute([$id]);
    
    jsonResponse([
        'message' => 'Staff approved successfully',
        'staff' => [
            'id' => $staff['id'],
            'name' => $staff['name'],
            'email' => $staff['email'],
            'department' => $staff['department']
        ]
    ]);
}

/**
 * Reject/Delete a staff registration
 */
function rejectStaff($id) {
    $authUser = requireAuth();
    
    // Only admin can reject staff
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized - Only Principal can reject staff'], 403);
    }
    
    $db = getDB();
    
    // Check if staff exists
    $stmt = $db->prepare("SELECT * FROM staff WHERE id = ?");
    $stmt->execute([$id]);
    $staff = $stmt->fetch();
    
    if (!$staff) {
        jsonResponse(['error' => 'Staff not found'], 404);
    }
    
    // Delete the staff registration
    $stmt = $db->prepare("DELETE FROM staff WHERE id = ?");
    $stmt->execute([$id]);
    
    jsonResponse([
        'message' => 'Staff registration rejected and removed',
        'staff' => [
            'id' => $staff['id'],
            'name' => $staff['name'],
            'email' => $staff['email']
        ]
    ]);
}

/**
 * Delete a staff member
 */
function deleteStaff($id) {
    $authUser = requireAuth();
    
    // Only admin can delete staff
    if ($authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $db = getDB();
    
    $stmt = $db->prepare("SELECT * FROM staff WHERE id = ?");
    $stmt->execute([$id]);
    $staff = $stmt->fetch();
    
    if (!$staff) {
        jsonResponse(['error' => 'Staff not found'], 404);
    }
    
    $stmt = $db->prepare("DELETE FROM staff WHERE id = ?");
    $stmt->execute([$id]);
    
    jsonResponse(['message' => 'Staff deleted successfully']);
}

function getUsers($role = null) {
    $authUser = requireAuth();
    $db = getDB();
    
    // Only staff and admin can list users
    if ($authUser['role'] === 'student') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $users = [];
    
    if (!$role || $role === 'staff') {
        $stmt = $db->prepare("SELECT id, email, name, 'staff' as role, department, avatar, is_approved, created_at FROM staff ORDER BY name ASC");
        $stmt->execute();
        $users = array_merge($users, $stmt->fetchAll());
    }
    
    if (!$role || $role === 'student') {
        $stmt = $db->prepare("SELECT id, email, name, 'student' as role, department, avatar, created_at FROM students ORDER BY name ASC");
        $stmt->execute();
        $users = array_merge($users, $stmt->fetchAll());
    }
    
    jsonResponse($users);
}

function getUser($id, $role = null) {
    $authUser = requireAuth();
    $db = getDB();
    
    $user = null;
    
    if ($role === 'staff') {
        $stmt = $db->prepare("SELECT id, email, name, 'staff' as role, department, avatar, is_approved, created_at FROM staff WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
    } else if ($role === 'student') {
        $stmt = $db->prepare("SELECT id, email, name, 'student' as role, department, avatar, created_at FROM students WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
    }
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    jsonResponse($user);
}

function updateUser($id) {
    $authUser = requireAuth();
    $db = getDB();
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
    $data = $isMultipart ? $_POST : getRequestBody();

    if (!is_array($data)) {
        $data = [];
    }
    
    // Users can only update their own profile unless admin
    if ($authUser['role'] !== 'admin' && $authUser['id'] != $id) {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $updates = [];
    $params = [];
    
    if (isset($data['name'])) {
        $updates[] = "name = ?";
        $params[] = $data['name'];
    }
    
    if (isset($data['department'])) {
        $updates[] = "department = ?";
        $params[] = $data['department'];
    }
    
    if (isset($data['avatar'])) {
        $updates[] = "avatar = ?";
        $params[] = $data['avatar'];
    }

    if ($isMultipart && isset($_FILES['avatarFile']) && ($_FILES['avatarFile']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
        $avatarUrl = saveProfilePhotoUpload($_FILES['avatarFile']);
        if ($avatarUrl) {
            $updates[] = "avatar = ?";
            $params[] = $avatarUrl;
        }
    }
    
    // Password change
    if (isset($data['password']) && !empty($data['password'])) {
        $updates[] = "password = ?";
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    if (count($updates) === 0) {
        jsonResponse(['error' => 'No updates provided'], 400);
    }
    
    $params[] = $id;
    $userType = $data['userType'] ?? $authUser['user_type'] ?? $authUser['role'] ?? '';
    if ($userType === 'student') {
        $table = 'students';
    } else if ($userType === 'admin') {
        $table = 'admins';
    } else {
        $table = 'staff';
    }
    $sql = "UPDATE $table SET " . implode(", ", $updates) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse(['message' => 'User updated successfully']);
}

function changePassword() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';
    
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        jsonResponse(['error' => 'All password fields are required'], 400);
    }
    
    if ($newPassword !== $confirmPassword) {
        jsonResponse(['error' => 'New passwords do not match'], 400);
    }
    
    if (strlen($newPassword) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }
    
    // Determine which table to use based on authenticated user type.
    $userType = $authUser['user_type'] ?? $authUser['role'] ?? '';
    if ($userType === 'student') {
        $table = 'students';
    } else if ($userType === 'admin') {
        $table = 'admins';
    } else {
        $table = 'staff';
    }
    
    // Get current password hash
    $stmt = $db->prepare("SELECT password FROM $table WHERE id = ?");
    $stmt->execute([$authUser['id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Verify current password
    if (!password_verify($currentPassword, $user['password'])) {
        jsonResponse(['error' => 'Current password is incorrect'], 400);
    }
    
    // Update password
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE $table SET password = ? WHERE id = ?");
    $stmt->execute([$newPasswordHash, $authUser['id']]);
    
    jsonResponse(['message' => 'Password changed successfully']);
}

function initiatePrincipalTransfer() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();

    ensurePrincipalTransferSchema($db);

    if (($authUser['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Unauthorized - Only Principal can transfer principal access'], 403);
    }

    $newPrincipalName = trim($data['name'] ?? '');
    $newPrincipalEmail = trim($data['email'] ?? '');
    $newPrincipalMobile = trim($data['mobile'] ?? '');

    if ($newPrincipalName === '' || $newPrincipalEmail === '' || $newPrincipalMobile === '') {
        jsonResponse(['error' => 'Name, email, and mobile number are required'], 400);
    }

    $stmt = $db->prepare("SELECT id FROM staff WHERE email = ? OR mobile = ?");
    $stmt->execute([$newPrincipalEmail, $newPrincipalMobile]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'A staff account already exists with the same email or mobile number'], 400);
    }

    try {
        $db->beginTransaction();

        $token = bin2hex(random_bytes(32));
        $setupUrl = getFrontendBaseUrl() . '/principal-setup?token=' . urlencode($token);

        $stmt = $db->prepare("INSERT INTO principal_invites 
            (token, requested_by_admin_id, requested_by_admin_name, requested_by_admin_email, new_principal_name, new_principal_email, new_principal_mobile, transfer_mode, status, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'permanent', 'pending', DATE_ADD(NOW(), INTERVAL 7 DAY))");
        $stmt->execute([
            $token,
            $authUser['id'],
            $authUser['name'],
            $authUser['email'],
            $newPrincipalName,
            $newPrincipalEmail,
            $newPrincipalMobile
        ]);

        $emailSent = sendPrincipalInviteEmail($newPrincipalEmail, $newPrincipalName, $setupUrl);

        $db->commit();

        jsonResponse([
            'message' => $emailSent
                ? 'Principal invite sent successfully'
                : 'Principal invite created, but email delivery was not confirmed',
            'setupUrl' => $setupUrl,
            'emailSent' => $emailSent
        ]);
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        jsonResponse(['error' => 'Failed to transfer principal access'], 500);
    }
}

function assignTemporaryPrincipal() {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();

    ensurePrincipalTransferSchema($db);

    if (($authUser['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Unauthorized - Only Principal can assign temporary principal access'], 403);
    }

    $staffId = (int)($data['staffId'] ?? 0);
    if ($staffId <= 0) {
        jsonResponse(['error' => 'Staff member is required'], 400);
    }

    $stmt = $db->prepare("SELECT id, email, password, name, department, mobile, employee_id, designation, avatar, is_approved 
                          FROM staff WHERE id = ?");
    $stmt->execute([$staffId]);
    $staff = $stmt->fetch();

    if (!$staff) {
        jsonResponse(['error' => 'Staff member not found'], 404);
    }

    if (!(int)($staff['is_approved'] ?? 0)) {
        jsonResponse(['error' => 'Selected staff member must be approved before assignment'], 400);
    }

    $stmt = $db->prepare("INSERT INTO admins (email, password, name, department, mobile, employee_id, designation, avatar, principal_type) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'temporary') 
                          ON DUPLICATE KEY UPDATE 
                              password = VALUES(password),
                              name = VALUES(name),
                              department = VALUES(department),
                              mobile = VALUES(mobile),
                              employee_id = VALUES(employee_id),
                              designation = VALUES(designation),
                              avatar = VALUES(avatar),
                              principal_type = VALUES(principal_type)");
    $stmt->execute([
        $staff['email'],
        $staff['password'],
        $staff['name'],
        $staff['department'],
        $staff['mobile'],
        $staff['employee_id'],
        $staff['designation'] ?: 'Temporary Principal',
        $staff['avatar']
    ]);

    jsonResponse([
        'message' => 'Temporary principal assigned successfully',
        'staff' => [
            'id' => $staff['id'],
            'name' => $staff['name'],
            'email' => $staff['email'],
            'department' => $staff['department']
        ]
    ]);
}

function getPrincipalInvite() {
    $db = getDB();
    $token = trim($_GET['token'] ?? '');

    ensurePrincipalTransferSchema($db);

    if ($token === '') {
        jsonResponse(['error' => 'Invite token is required'], 400);
    }

    $stmt = $db->prepare("SELECT token, new_principal_name, new_principal_email, new_principal_mobile, transfer_mode, status, expires_at 
                          FROM principal_invites WHERE token = ? LIMIT 1");
    $stmt->execute([$token]);
    $invite = $stmt->fetch();

    if (!$invite) {
        jsonResponse(['error' => 'Invite not found'], 404);
    }

    if ($invite['status'] === 'pending' && strtotime($invite['expires_at']) < time()) {
        $stmt = $db->prepare("UPDATE principal_invites SET status = 'expired' WHERE token = ?");
        $stmt->execute([$token]);
        jsonResponse(['error' => 'Invite has expired'], 410);
    }

    jsonResponse($invite);
}

function completePrincipalInvite() {
    $db = getDB();
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
    $data = $isMultipart ? $_POST : getRequestBody();

    ensurePrincipalTransferSchema($db);

    if (!is_array($data)) {
        $data = [];
    }

    $token = trim($data['token'] ?? '');
    $password = $data['password'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';

    if ($token === '' || $password === '' || $confirmPassword === '') {
        jsonResponse(['error' => 'Token, password, and confirmation are required'], 400);
    }

    if ($password !== $confirmPassword) {
        jsonResponse(['error' => 'Passwords do not match'], 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters long'], 400);
    }

    $stmt = $db->prepare("SELECT * FROM principal_invites WHERE token = ? LIMIT 1");
    $stmt->execute([$token]);
    $invite = $stmt->fetch();

    if (!$invite) {
        jsonResponse(['error' => 'Invite not found'], 404);
    }

    if ($invite['status'] !== 'pending') {
        jsonResponse(['error' => 'Invite has already been used'], 400);
    }

    if (strtotime($invite['expires_at']) < time()) {
        $stmt = $db->prepare("UPDATE principal_invites SET status = 'expired' WHERE token = ?");
        $stmt->execute([$token]);
        jsonResponse(['error' => 'Invite has expired'], 410);
    }

    $avatarUrl = null;
    if ($isMultipart && isset($_FILES['avatarFile']) && ($_FILES['avatarFile']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
        $avatarUrl = saveProfilePhotoUpload($_FILES['avatarFile']);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO admins (email, password, name, department, mobile, employee_id, designation, avatar, principal_type) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'permanent') 
                              ON DUPLICATE KEY UPDATE 
                                  password = VALUES(password),
                                  name = VALUES(name),
                                  department = VALUES(department),
                                  mobile = VALUES(mobile),
                                  employee_id = VALUES(employee_id),
                                  designation = VALUES(designation),
                                  avatar = VALUES(avatar),
                                  principal_type = VALUES(principal_type)");
        $stmt->execute([
            $invite['new_principal_email'],
            $passwordHash,
            $invite['new_principal_name'],
            'Administration',
            $invite['new_principal_mobile'],
            'ADMIN-' . strtoupper(substr($invite['token'], 0, 8)),
            'Principal',
            $avatarUrl
        ]);

        $stmt = $db->prepare("UPDATE principal_invites SET status = 'awaiting_login', completed_at = NOW() WHERE token = ?");
        $stmt->execute([$token]);

        $db->commit();

        jsonResponse([
            'message' => 'Principal profile setup completed. Please log in to finish transfer.',
            'email' => $invite['new_principal_email']
        ]);
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        jsonResponse(['error' => 'Failed to complete principal invite'], 500);
    }
}

function saveProfilePhotoUpload($file) {
    if (!isset($file['tmp_name'], $file['name'], $file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $maxSize = 5 * 1024 * 1024;
    $allowedMimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp'
    ];

    if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxSize) {
        return null;
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!$mimeType || !isset($allowedMimeToExt[$mimeType])) {
        return null;
    }

    $uploadDir = __DIR__ . '/uploads/avatars';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $storedName = uniqid('avatar_', true) . '.' . $allowedMimeToExt[$mimeType];
    $destinationPath = $uploadDir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
        return null;
    }

    return '/api/uploads/avatars/' . rawurlencode($storedName);
}

function getFrontendBaseUrl() {
    if (!empty($_SERVER['HTTP_ORIGIN'])) {
        return rtrim($_SERVER['HTTP_ORIGIN'], '/');
    }

    if (!empty($_SERVER['HTTP_REFERER'])) {
        $parts = parse_url($_SERVER['HTTP_REFERER']);
        if (!empty($parts['scheme']) && !empty($parts['host'])) {
            $base = $parts['scheme'] . '://' . $parts['host'];
            if (!empty($parts['port'])) {
                $base .= ':' . $parts['port'];
            }
            return $base;
        }
    }

    return 'http://localhost:8080';
}

function sendPrincipalInviteEmail($recipientEmail, $recipientName, $setupUrl) {
    $subject = 'Principal account setup link';
    $message = "Hello {$recipientName},\n\nYour principal account setup link is:\n{$setupUrl}\n\nUse this link to create your password and finish profile setup.\n\nThis link expires in 7 days.";
    $headers = 'From: no-reply@campus-relief.local';

    if (!function_exists('mail')) {
        return false;
    }

    return @mail($recipientEmail, $subject, $message, $headers);
}

function ensurePrincipalTransferSchema($db) {
    try {
        $stmt = $db->query("SHOW COLUMNS FROM admins LIKE 'principal_type'");
        $hasPrincipalType = (bool)$stmt->fetch();
        if (!$hasPrincipalType) {
            $db->exec("ALTER TABLE admins ADD COLUMN principal_type ENUM('permanent', 'temporary') NOT NULL DEFAULT 'permanent' AFTER designation");
        }
    } catch (Throwable $e) {
        // Ignore if schema cannot be altered at runtime; API calls will surface concrete errors later.
    }

    try {
        $stmt = $db->query("SHOW TABLES LIKE 'principal_invites'");
        $hasInvitesTable = (bool)$stmt->fetch();
        if (!$hasInvitesTable) {
            $db->exec("CREATE TABLE principal_invites (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
    } catch (Throwable $e) {
        // Ignore if schema cannot be altered at runtime; API calls will surface concrete errors later.
    }
}
