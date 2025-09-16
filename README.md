# Simple Auth

A minimal authentication service with basic registration and login functionality.

## Features

- User registration with username, email, and password
- User login with email and password
- Password hashing with bcrypt
- MongoDB Atlas integration
- Simple validation (no null values)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your MongoDB Atlas URI:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/simple_auth
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Base URL
```
http://localhost:5000/api/auth
```

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## Response Format

All responses follow this format:
```json
{
  "success": true/false,
  "message": "Response message",
  "data": {
    "user": {
      "id": "user_id",
      "username": "username",
      "email": "email"
    }
  }
}
```

## Testing with Postman

1. **Test Registration**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "username": "testuser",
       "email": "test@example.com",
       "password": "testpass123"
     }
     ```

2. **Test Login**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "testpass123"
     }
     ```

## Deployment

This app is ready for deployment on Vercel. Make sure to set the `MONGODB_URI` environment variable in your deployment platform.
