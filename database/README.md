# Campus Relief Stream - Database Setup

## Prerequisites
- XAMPP installed and running
- MySQL/MariaDB service started

## Database Setup Instructions

### Step 1: Start XAMPP
1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL** services

### Step 2: Import Database
1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Click **"Import"** tab
3. Click **"Choose File"** and select `database/campus_relief.sql`
4. Click **"Go"** to import

Or via command line:
```bash
cd C:\xampp\mysql\bin
mysql -u root < C:\xampp\htdocs\campus-relief-stream-main\database\campus_relief.sql
```

### Step 3: Verify Database
In phpMyAdmin, you should see:
- Database: `campus_relief_db`
- Tables: `users`, `grievances`, `attachments`, `comments`, `status_logs`

## Default Login Credentials

| Role    | Email                     | Password     |
|---------|---------------------------|--------------|
| Student | john.doe@university.edu   | password123  |
| Staff   | staff@university.edu      | password123  |
| Admin   | admin@university.edu      | password123  |

## API Endpoints

### Authentication
- `POST /api/auth.php?action=login` - Login
- `POST /api/auth.php?action=register` - Register
- `GET /api/auth.php?action=me` - Get current user

### Grievances
- `GET /api/grievances.php` - List grievances
- `GET /api/grievances.php?id={id}` - Get grievance details
- `POST /api/grievances.php` - Create grievance
- `PUT /api/grievances.php?id={id}` - Update grievance
- `DELETE /api/grievances.php?id={id}` - Delete grievance
- `GET /api/grievances.php?action=stats` - Get statistics

### Comments
- `GET /api/comments.php?grievance_id={id}` - List comments
- `POST /api/comments.php?grievance_id={id}` - Add comment
- `DELETE /api/comments.php?grievance_id={id}&id={commentId}` - Delete comment

### Users
- `GET /api/users.php` - List users (staff/admin only)
- `GET /api/users.php?id={id}` - Get user
- `PUT /api/users.php?id={id}` - Update user

## Configuration

Edit `api/config.php` to change:
- Database host, name, user, password
- JWT secret key
- CORS settings

## Troubleshooting

### Database Connection Error
1. Ensure MySQL is running in XAMPP
2. Check credentials in `api/config.php`
3. Verify database exists: `campus_relief_db`

### CORS Issues
Update the `Access-Control-Allow-Origin` in `api/config.php` to match your frontend URL.
