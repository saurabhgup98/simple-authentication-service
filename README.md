# Central Authentication Service

A comprehensive authentication service built with Node.js, Express, and MongoDB. Supports local authentication, OAuth (Google, Facebook, GitHub), email verification, and password reset functionality.

## 🚀 Features

- **Local Authentication**: Register, login, logout with email/password
- **OAuth Integration**: Google, Facebook, and GitHub authentication
- **Email Verification**: Automatic email verification on registration
- **Password Reset**: Secure password reset via email
- **JWT Tokens**: Access and refresh token management
- **Security Features**: Rate limiting, account lockout, password validation
- **Profile Management**: Update profile, change password, delete account

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to the project**
   ```bash
   cd simple-authentication
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   BACKEND_URL=http://localhost:5000

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/auth_service

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Security Configuration
   BCRYPT_SALT_ROUNDS=12
   LOGIN_MAX_ATTEMPTS=5
   LOGIN_LOCKOUT_DURATION=900000

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

   # Frontend URL (for email links and OAuth redirects)
   FRONTEND_URL=http://localhost:3000

   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM_NAME=Authentication Service

   # OAuth Configuration (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout User
```http
POST /auth/logout
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

#### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

#### Resend Verification Email
```http
POST /auth/resend-verification
Authorization: Bearer your-access-token
```

### User Profile Endpoints

#### Get Profile
```http
GET /user/profile
Authorization: Bearer your-access-token
```

#### Update Profile
```http
PUT /user/profile
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

#### Change Password
```http
POST /user/change-password
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "currentPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

#### Delete Account
```http
DELETE /user/account
Authorization: Bearer your-access-token
```

### OAuth Endpoints

#### Google OAuth
```http
GET /oauth/google
```

#### Facebook OAuth
```http
GET /oauth/facebook
```

#### GitHub OAuth
```http
GET /oauth/github
```

## 🧪 Testing with Postman

### 1. Health Check
```http
GET http://localhost:5000/health
```

### 2. API Documentation
```http
GET http://localhost:5000/api
```

### 3. Test Registration
1. Create a new POST request to `http://localhost:5000/api/auth/register`
2. Set Content-Type header to `application/json`
3. Add body:
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "TestPass123!"
   }
   ```
4. Send request and save the response tokens

### 4. Test Login
1. Create a new POST request to `http://localhost:5000/api/auth/login`
2. Set Content-Type header to `application/json`
3. Add body:
   ```json
   {
     "email": "test@example.com",
     "password": "TestPass123!"
   }
   ```
4. Send request and save the response tokens

### 5. Test Protected Route
1. Create a new GET request to `http://localhost:5000/api/user/profile`
2. Add Authorization header: `Bearer your-access-token`
3. Send request

### 6. Test Token Refresh
1. Create a new POST request to `http://localhost:5000/api/auth/refresh`
2. Set Content-Type header to `application/json`
3. Add body:
   ```json
   {
     "refreshToken": "your-refresh-token"
   }
   ```
4. Send request

### 7. Test Logout
1. Create a new POST request to `http://localhost:5000/api/auth/logout`
2. Add Authorization header: `Bearer your-access-token`
3. Set Content-Type header to `application/json`
4. Add body:
   ```json
   {
     "refreshToken": "your-refresh-token"
   }
   ```
5. Send request

## 🔧 Environment Variables

### Required Variables
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `BACKEND_URL`: Backend server URL
- `FRONTEND_URL`: Frontend application URL

### Optional Variables
- `EMAIL_*`: Email configuration for verification and password reset
- `GOOGLE_*`: Google OAuth configuration
- `FACEBOOK_*`: Facebook OAuth configuration
- `GITHUB_*`: GitHub OAuth configuration

## 🔒 Security Features

- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Account Lockout**: Account locked after 5 failed login attempts for 15 minutes
- **Rate Limiting**: API rate limiting to prevent abuse
- **JWT Security**: Short-lived access tokens with refresh token rotation
- **Email Verification**: Required email verification for new accounts
- **Password Reset**: Secure password reset via email tokens

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed),
  name: String (required),
  isActive: Boolean (default: true),
  emailVerified: Boolean (default: false),
  googleId: String (unique, sparse),
  facebookId: String (unique, sparse),
  githubId: String (unique, sparse),
  oauthProvider: String (enum: ['google', 'facebook', 'github', 'local']),
  loginAttempts: Number (default: 0),
  accountLockedUntil: Date,
  lastLoginAt: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  oauthData: {
    picture: String,
    oauthEmail: String,
    oauthName: String,
    oauthVerified: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Refresh Tokens Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  token: String (unique),
  expiresAt: Date,
  createdAt: Date
}
```

## 🚀 Deployment

### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
