import express from 'express';
import { test, register, login } from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.get('/test', test);
router.post('/register', register);
router.post('/login', login);

export default router;