<?php
/**
 * Authentication API
 * Handles login, logout, and user registration
 * Updated for separate Student, Staff, and Admin tables
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleLogin();
        break;
        
    case 'register':
        if ($method !== 'POST') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleRegister();
        break;
        
    case 'me':
        if ($method !== 'GET') {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleGetCurrentUser();
        break;
        
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function handleLogin() {
    $data = getRequestBody();
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResponse(['error' => 'Email and password are required'], 400);
    }
    
    $db = getDB();
    $user = null;
    $userType = '';
    
    // Check based on role - each role has its own table
    if ($role === 'student') {
        $stmt = $db->prepare("SELECT * FROM students WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        $userType = 'student';
        if ($user) {
            $user['role'] = 'student';
        }
    } else if ($role === 'staff') {
        $stmt = $db->prepare("SELECT * FROM staff WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        $userType = 'staff';
        if ($user) {
            $user['role'] = 'staff';
            // Check if staff account is approved by principal
            if (!$user['is_approved']) {
                jsonResponse(['error' => 'Your account is pending approval by the Principal. Please wait for approval.'], 403);
            }
        }
    } else if ($role === 'admin') {
        $stmt = $db->prepare("SELECT * FROM admins WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        $userType = 'admin';
        if ($user) {
            $user['role'] = 'admin';
        }
    }
    
    if (!$user) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }

    // Support legacy plaintext passwords and transparently migrate to hashed passwords.
    if (!verifyPasswordFlexible($db, $user, $userType, $password)) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }

    if ($userType === 'admin') {
        finalizePrincipalTransferIfNeeded($db, $user);
    }
    
    // Generate JWT token
    $token = jwt_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'user_type' => $userType,
        'department' => $user['department'] ?? null,
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]);
    
    unset($user['password']);
    $user['user_type'] = $userType;
    
    jsonResponse([
        'user' => $user,
        'token' => $token
    ]);
}

function verifyPasswordFlexible($db, &$user, $userType, $inputPassword) {
    $storedPassword = $user['password'] ?? '';

    if (empty($storedPassword)) {
        return false;
    }

    // Normal secure path.
    if (password_verify($inputPassword, $storedPassword)) {
        return true;
    }

    // Legacy compatibility path for databases that still store plaintext passwords.
    if (!hash_equals($storedPassword, $inputPassword)) {
        return false;
    }

    // Migrate plaintext password to a secure hash after successful login.
    $newHash = password_hash($inputPassword, PASSWORD_DEFAULT);
    $tableMap = [
        'student' => 'students',
        'staff' => 'staff',
        'admin' => 'admins'
    ];

    if (!isset($tableMap[$userType])) {
        return true;
    }

    $table = $tableMap[$userType];
    $stmt = $db->prepare("UPDATE {$table} SET password = ? WHERE id = ?");
    $stmt->execute([$newHash, $user['id']]);
    $user['password'] = $newHash;

    return true;
}

function handleRegister() {
    $data = getRequestBody();
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $name = $data['name'] ?? '';
    $role = $data['role'] ?? 'student';
    $department = $data['department'] ?? '';
    $mobile = $data['mobile'] ?? '';
    $studentId = $data['studentId'] ?? null;
    $employeeId = $data['employeeId'] ?? null;
    $designation = $data['designation'] ?? null;
    
    if (empty($email) || empty($password) || empty($name)) {
        jsonResponse(['error' => 'Email, password, and name are required'], 400);
    }
    
    if (empty($department) || empty($mobile)) {
        jsonResponse(['error' => 'Department and mobile are required'], 400);
    }
    
    $db = getDB();
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    if ($role === 'student') {
        if (empty($studentId)) {
            jsonResponse(['error' => 'Student ID is required'], 400);
        }
        
        // Check if email or student_id exists
        $stmt = $db->prepare("SELECT id FROM students WHERE email = ? OR student_id = ?");
        $stmt->execute([$email, $studentId]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Email or Student ID already registered'], 400);
        }
        
        // Insert student
        $stmt = $db->prepare("INSERT INTO students (email, password, name, department, mobile, student_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$email, $hashedPassword, $name, $department, $mobile, $studentId]);
        
        $userId = $db->lastInsertId();
        
        // Get created student
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, student_id, created_at FROM students WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        $user['role'] = 'student';
        $user['user_type'] = 'student';
        
    } else if ($role === 'staff') {
        // Staff registration
        if (empty($employeeId)) {
            jsonResponse(['error' => 'Employee ID is required'], 400);
        }
        
        // Check if email or employee_id exists
        $stmt = $db->prepare("SELECT id FROM staff WHERE email = ? OR employee_id = ?");
        $stmt->execute([$email, $employeeId]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Email or Employee ID already registered'], 400);
        }
        
        // Insert staff
        $stmt = $db->prepare("INSERT INTO staff (email, password, name, department, mobile, employee_id, designation) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$email, $hashedPassword, $name, $department, $mobile, $employeeId, $designation]);
        
        $userId = $db->lastInsertId();
        
        // Get created staff
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, created_at FROM staff WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        $user['role'] = 'staff';
        $user['user_type'] = 'staff';
        
    } else if ($role === 'admin') {
        // Admin registration
        if (empty($employeeId)) {
            jsonResponse(['error' => 'Employee ID is required'], 400);
        }
        
        // Check if email or employee_id exists
        $stmt = $db->prepare("SELECT id FROM admins WHERE email = ? OR employee_id = ?");
        $stmt->execute([$email, $employeeId]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Email or Employee ID already registered'], 400);
        }
        
        // Insert admin
        $stmt = $db->prepare("INSERT INTO admins (email, password, name, department, mobile, employee_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$email, $hashedPassword, $name, $department, $mobile, $employeeId]);
        
        $userId = $db->lastInsertId();
        
        // Get created admin
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, created_at FROM admins WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        $user['role'] = 'admin';
        $user['user_type'] = 'admin';
        
    } else {
        jsonResponse(['error' => 'Invalid role'], 400);
    }
    
    // Generate JWT token
    $token = jwt_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'user_type' => $user['user_type'],
        'exp' => time() + (24 * 60 * 60)
    ]);
    
    jsonResponse([
        'user' => $user,
        'token' => $token
    ], 201);
}

function handleGetCurrentUser() {
    $authUser = requireAuth();
    
    $db = getDB();
    $userType = $authUser['user_type'] ?? $authUser['role'];
    
    if ($userType === 'student') {
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, student_id, year_of_study, section, avatar, created_at FROM students WHERE id = ?");
        $stmt->execute([$authUser['id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['role'] = 'student';
            $user['user_type'] = 'student';
        }
    } else if ($userType === 'staff') {
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, designation, avatar, created_at FROM staff WHERE id = ?");
        $stmt->execute([$authUser['id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['role'] = 'staff';
            $user['user_type'] = 'staff';
        }
    } else if ($userType === 'admin') {
        $selectPrincipalType = dbColumnExists($db, 'admins', 'principal_type')
            ? ', principal_type'
            : '';
        $stmt = $db->prepare("SELECT id, email, name, department, mobile, employee_id, designation, avatar{$selectPrincipalType}, created_at FROM admins WHERE id = ?");
        $stmt->execute([$authUser['id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['role'] = 'admin';
            $user['user_type'] = 'admin';
            if (!isset($user['principal_type'])) {
                $user['principal_type'] = 'permanent';
            }
        }
    }
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    jsonResponse($user);
}

function finalizePrincipalTransferIfNeeded($db, $adminUser) {
    if (!dbTableExists($db, 'principal_invites')) {
        return;
    }

    $stmt = $db->prepare("SELECT * FROM principal_invites 
                          WHERE new_principal_email = ? AND transfer_mode = 'permanent' AND status = 'awaiting_login' 
                          ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$adminUser['email']]);
    $invite = $stmt->fetch();

    if (!$invite) {
        return;
    }

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("DELETE FROM admins WHERE id = ?");
        $stmt->execute([$invite['requested_by_admin_id']]);

        $stmt = $db->prepare("UPDATE principal_invites SET status = 'finalized', finalized_at = NOW() WHERE id = ?");
        $stmt->execute([$invite['id']]);

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}

function dbTableExists($db, $tableName) {
    try {
        $stmt = $db->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tableName]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }
}

function dbColumnExists($db, $tableName, $columnName) {
    try {
        $stmt = $db->prepare("SHOW COLUMNS FROM {$tableName} LIKE ?");
        $stmt->execute([$columnName]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }
}
