import express from 'express';
import {
  getAllUsers,
  getUserById,
  addUserAppAccess,
  updateUserAppRole,
  deactivateUserFromApp,
  reactivateUserInApp,
  getUsersByApp
} from '../controllers/userController.js';

import { protectWithApp, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protectWithApp);
router.use(requireAdmin);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);

// App access management routes
router.post('/users/:userId/apps', addUserAppAccess);
router.put('/users/:userId/apps/:appIdentifier', updateUserAppRole);
router.delete('/users/:userId/apps/:appIdentifier', deactivateUserFromApp);
router.post('/users/:userId/apps/:appIdentifier/reactivate', reactivateUserInApp);

// App-specific user management
router.get('/apps/:appIdentifier/users', getUsersByApp);

export default router;
