<?php
/**
 * Database Configuration
 * Campus Relief Stream
 */

// Suppress PHP errors from outputting HTML - we'll handle errors in JSON
error_reporting(0);
ini_set('display_errors', 0);

// Set up custom error handler to return JSON errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Log error for debugging
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    return true; // Don't execute PHP internal error handler
});

set_exception_handler(function($exception) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error: ' . $exception->getMessage()]);
    exit();
});

define('DB_HOST', 'localhost');
define('DB_NAME', 'campus_relief_db');
define('DB_USER', 'root');
define('DB_PASS', ''); // Default XAMPP has no password

// JWT Secret for authentication
define('JWT_SECRET', 'your-secret-key-change-in-production');

// CORS Headers for React app
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Database Connection Class
 */
class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        try {
            $this->conn = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit();
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}

/**
 * Helper function to get database connection
 */
function getDB() {
    return Database::getInstance()->getConnection();
}

/**
 * Send JSON response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Get request body as JSON
 */
function getRequestBody() {
    return json_decode(file_get_contents('php://input'), true);
}

/**
 * Simple JWT encode
 */
function jwt_encode($payload) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode($payload));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

/**
 * Simple JWT decode
 */
function jwt_decode($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    
    list($header, $payload, $signature) = $parts;
    
    $valid_signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if ($signature !== $valid_signature) return null;
    
    return json_decode(base64_decode($payload), true);
}

/**
 * Get authenticated user from token
 */
function getAuthUser() {
    $authHeader = '';
    
    // Try multiple ways to get the Authorization header
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        // Headers can be case-insensitive
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $authHeader = $value;
                break;
            }
        }
    }
    
    // Fallback: Check $_SERVER
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    // Fallback: Check Apache-specific variable
    if (empty($authHeader) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    
    return jwt_decode($matches[1]);
}

/**
 * Require authentication
 */
function requireAuth() {
    $user = getAuthUser();
    if (!$user) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return $user;
}
