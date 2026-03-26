<?php
/**
 * Comments API
 * Handles comments on grievances
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$grievanceId = $_GET['grievance_id'] ?? null;
$commentId = $_GET['id'] ?? null;

if (!$grievanceId) {
    jsonResponse(['error' => 'Grievance ID required'], 400);
}

switch ($method) {
    case 'GET':
        getComments($grievanceId);
        break;
        
    case 'POST':
        addComment($grievanceId);
        break;
        
    case 'DELETE':
        if (!$commentId) {
            jsonResponse(['error' => 'Comment ID required'], 400);
        }
        deleteComment($commentId);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getComments($grievanceId) {
    $authUser = requireAuth();
    $db = getDB();
    
    // Check access
    $stmt = $db->prepare("SELECT student_id FROM grievances WHERE id = ?");
    $stmt->execute([$grievanceId]);
    $grievance = $stmt->fetch();
    
    if (!$grievance) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    
    if ($authUser['role'] === 'student' && $grievance['student_id'] != $authUser['id']) {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $sql = "SELECT * FROM comments WHERE grievance_id = ?";
    
    // Hide internal comments from students
    if ($authUser['role'] === 'student') {
        $sql .= " AND is_internal = 0";
    }
    
    $sql .= " ORDER BY created_at ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$grievanceId]);
    $comments = $stmt->fetchAll();
    
    jsonResponse($comments);
}

function addComment($grievanceId) {
    $authUser = requireAuth();
    $db = getDB();
    $data = getRequestBody();
    
    $content = $data['content'] ?? '';
    $isInternal = $data['isInternal'] ?? false;
    
    if (empty($content)) {
        jsonResponse(['error' => 'Comment content is required'], 400);
    }
    
    // Check grievance exists
    $stmt = $db->prepare("SELECT id FROM grievances WHERE id = ?");
    $stmt->execute([$grievanceId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Grievance not found'], 404);
    }
    
    // Only staff/admin can add internal comments
    if ($isInternal && $authUser['role'] === 'student') {
        $isInternal = false;
    }
    
    $stmt = $db->prepare("INSERT INTO comments (grievance_id, user_id, user_name, user_role, content, is_internal) 
                          VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $grievanceId,
        $authUser['id'],
        $authUser['name'],
        $authUser['role'],
        $content,
        $isInternal ? 1 : 0
    ]);
    
    $commentId = $db->lastInsertId();
    
    // Update grievance updated_at
    $stmt = $db->prepare("UPDATE grievances SET updated_at = NOW() WHERE id = ?");
    $stmt->execute([$grievanceId]);
    
    // Return created comment
    $stmt = $db->prepare("SELECT * FROM comments WHERE id = ?");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();
    
    jsonResponse($comment, 201);
}

function deleteComment($commentId) {
    $authUser = requireAuth();
    $db = getDB();
    
    // Get comment
    $stmt = $db->prepare("SELECT * FROM comments WHERE id = ?");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();
    
    if (!$comment) {
        jsonResponse(['error' => 'Comment not found'], 404);
    }
    
    // Only author or admin can delete
    if ($comment['user_id'] != $authUser['id'] && $authUser['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 403);
    }
    
    $stmt = $db->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->execute([$commentId]);
    
    jsonResponse(['message' => 'Comment deleted successfully']);
}
