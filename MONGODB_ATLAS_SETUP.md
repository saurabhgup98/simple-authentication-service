# MongoDB Atlas Setup Guide

## 🗄️ **Step-by-Step MongoDB Atlas Database Setup**

### **Step 1: Create MongoDB Atlas Account**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" or "Sign Up"
3. Create account with email/password or use Google/GitHub

### **Step 2: Create a New Project**
1. Click "New Project"
2. Enter project name: `Authentication Service`
3. Click "Next" and "Create Project"

### **Step 3: Create a Database Cluster**
1. Click "Build a Database"
2. Choose **FREE** tier (M0 Sandbox)
3. Select **AWS** as cloud provider
4. Choose region closest to you (e.g., `N. Virginia (us-east-1)`)
5. Click "Create"

### **Step 4: Set Up Database Access**
1. Click "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username: `auth_service_user`
5. Click "Autogenerate Secure Password" or create your own
6. **Save this password!** You'll need it for your `.env` file
7. Select "Read and write to any database"
8. Click "Add User"

### **Step 5: Set Up Network Access**
1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses
5. Click "Confirm"

### **Step 6: Get Connection String**
1. Go back to "Database" tab
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "5.0 or later"
5. Copy the connection string

### **Step 7: Update Your Environment File**

Create a `.env` file in your project root:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
BACKEND_URL=http://localhost:5000

# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://auth_service_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/auth_service?retryWrites=true&w=majority

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

### **Step 8: Replace Placeholder Values**

In your `.env` file, replace these values:

1. **MONGODB_URI**: Replace `YOUR_PASSWORD` with the password you created in Step 4
2. **JWT_SECRET**: Generate a strong secret key (you can use a password generator)
3. **Other values**: Update as needed for your setup

### **Step 9: Test Connection**

1. Start your server:
   ```bash
   npm run dev
   ```

2. Check the console for:
   ```
   MongoDB Connected: cluster0.xxxxx.mongodb.net
   ```

3. Test with Postman:
   - Import the `postman_collection.json`
   - Test the "Health Check" endpoint
   - Test the "API Documentation" endpoint

### **Step 10: Verify Database Creation**

1. Go back to MongoDB Atlas
2. Click "Browse Collections" on your cluster
3. You should see a database named `auth_service` created automatically
4. It will contain collections: `users` and `refreshtokens`

## 🔧 **Troubleshooting**

### **Connection Issues**
- Check if your IP is whitelisted in Network Access
- Verify username and password in connection string
- Ensure cluster is running (green status)

### **Authentication Errors**
- Make sure database user has "Read and write" permissions
- Check if password contains special characters (URL encode if needed)

### **Database Not Created**
- The database and collections are created automatically when you first use the API
- Try registering a user first to create the database

## 🚀 **Next Steps**

1. **Test the API**: Use Postman collection to test all endpoints
2. **Set up Email**: Configure email settings for verification emails
3. **Configure OAuth**: Set up Google/Facebook/GitHub OAuth if needed
4. **Deploy**: When ready, deploy to Vercel or Railway

## 📊 **Database Collections**

Your database will automatically create these collections:

- **users**: Stores user accounts and profiles
- **refreshtokens**: Stores refresh tokens for authentication

## 🔒 **Security Notes**

- Never commit your `.env` file to version control
- Use strong passwords for database users
- Regularly rotate JWT secrets
- Monitor database access logs in Atlas
