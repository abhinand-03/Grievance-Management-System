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
        if ($action === 'pending-staff') {
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
        if ($action === 'change-password') {
            changePassword();
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
    $data = getRequestBody();
    
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
    
    // Password change
    if (isset($data['password']) && !empty($data['password'])) {
        $updates[] = "password = ?";
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    if (count($updates) === 0) {
        jsonResponse(['error' => 'No updates provided'], 400);
    }
    
    $params[] = $id;
    $table = isset($data['userType']) && $data['userType'] === 'student' ? 'students' : 'staff';
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
    
    // Determine which table to use based on user role
    $table = $authUser['role'] === 'student' ? 'students' : 'staff';
    
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
