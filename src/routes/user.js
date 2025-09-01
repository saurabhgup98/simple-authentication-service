import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
} from '../controllers/userController.js';

import {
  validateProfileUpdate,
  validatePasswordChange
} from '../middleware/validation.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/change-password', validatePasswordChange, changePassword);
router.delete('/account', deleteAccount);

export default router;
