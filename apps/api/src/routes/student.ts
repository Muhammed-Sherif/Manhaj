import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../middleware/auth';
import { StudentController } from '../controllers/studentController';

const router: ExpressRouter = Router();
const studentController = new StudentController();

// All student routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /student/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     responses:
 *       200:
 *         description: Student profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 termId:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *   patch:
 *     summary: Update student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               termId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200: { description: Profile updated }
 */
router.get('/profile', studentController.getProfile);
router.patch('/profile', studentController.updateProfile);

/**
 * @swagger
 * /student/grades-with-terms:
 *   get:
 *     summary: Get grades with their terms
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     responses:
 *       200:
 *         description: Grades with terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   terms:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 */
router.get('/grades-with-terms', studentController.getGradesWithTerms);

// Attempts
/**
 * @swagger
 * /student/attempts/sync:
 *   post:
 *     summary: Sync student attempts to server
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempts]
 *             properties:
 *               attempts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Attempt'
 *     responses:
 *       200:
 *         description: Attempts synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       synced: { type: boolean }
 *                       reason: { type: string }
 */
router.post('/attempts/sync', studentController.syncAttempts);
router.get('/attempts/wrong-or-flagged', studentController.getWrongOrFlagged);

// Flags
/**
 * @swagger
 * /student/flags:
 *   post:
 *     summary: Flag a question
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionId]
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200: { description: Question flagged }
 */
router.post('/flags', studentController.createFlag);

/**
 * @swagger
 * /student/flags/{questionId}:
 *   delete:
 *     summary: Remove flag from question
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200: { description: Flag removed }
 */
router.delete('/flags/:questionId', studentController.deleteFlag);

/**
 * @swagger
 * /student/devices/register:
 *   post:
 *     summary: Register an Expo push token
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pushToken, platform]
 *             properties:
 *               pushToken: { type: string }
 *               platform: { type: string, enum: [ios, android] }
 *     responses:
 *       200: { description: Device token registered }
 */
router.post('/devices/register', studentController.registerDeviceToken);
router.delete('/devices/register', studentController.unregisterDeviceToken);

export { router as studentRoutes };
