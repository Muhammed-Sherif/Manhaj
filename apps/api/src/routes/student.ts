import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StudentController } from '../controllers/studentController.js';
import { StudentSyncController } from '../controllers/studentSyncController.js';

const router: ExpressRouter = Router();
const studentController = new StudentController();
const studentSyncController = new StudentSyncController();

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

/**
 * @swagger
 * /student/questions/unsolved:
 *   get:
 *     summary: Get unsolved questions for a lecture
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     parameters:
 *       - in: query
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Unsolved questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 */
router.get('/questions/unsolved', studentController.getUnsolvedQuestions);

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
/**
 * @swagger
 * /student/cases:
 *   get:
 *     summary: Get all cases for the student
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of cases
 *   post:
 *     summary: Create a case
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lectureId, category, title, content]
 *             properties:
 *               lectureId: { type: string, format: uuid }
 *               category: { type: string, enum: ['case', 'disease', 'drug'] }
 *               title: { type: string }
 *               content: { type: string }
 *               answer: { type: string }
 *     responses:
 *       201:
 *         description: Case created
 */
router.get('/cases', studentController.getCases);
router.post('/cases', studentController.createCase);

/**
 * @swagger
 * /student/cases/{id}:
 *   patch:
 *     summary: Update a case
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category: { type: string, enum: ['case', 'disease', 'drug'] }
 *               title: { type: string }
 *               content: { type: string }
 *               answer: { type: string }
 *     responses:
 *       200:
 *         description: Case updated
 *   delete:
 *     summary: Delete a case
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Case deleted
 */
router.patch('/cases/:id', studentController.updateCase);
router.delete('/cases/:id', studentController.deleteCase);

/**
 * @swagger
 * /student/notes:
 *   get:
 *     summary: Get all notes for the student
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of notes
 *   post:
 *     summary: Create a note
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lectureId, type, content]
 *             properties:
 *               lectureId: { type: string, format: uuid }
 *               type: { type: string, enum: ['note', 'recurring_question'] }
 *               content: { type: string }
 *               sourceQuestionId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Note created
 */
router.get('/notes', studentController.getNotes);
router.post('/notes', studentController.createNote);

/**
 * @swagger
 * /student/notes/{id}:
 *   patch:
 *     summary: Update a note
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: ['note', 'recurring_question'] }
 *               content: { type: string }
 *               sourceQuestionId: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Note updated
 *   delete:
 *     summary: Delete a note
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Note deleted
 */
router.patch('/notes/:id', studentController.updateNote);
router.delete('/notes/:id', studentController.deleteNote);

// Tasks
/**
 * @swagger
 * /student/tasks:
 *   get:
 *     summary: Get all tasks for the student
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of tasks
 *   post:
 *     summary: Create a task
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskType, status]
 *             properties:
 *               taskType: { type: string, enum: ['zekr', 'wird'] }
 *               startTime: { type: string, format: date-time, nullable: true }
 *               endTime: { type: string, format: date-time, nullable: true }
 *               consumedTime: { type: number, nullable: true }
 *               estimatedTime: { type: number, nullable: true }
 *               status: { type: string, enum: ['pending', 'in_progress', 'done', 'missed'] }
 *               achievedFrom: { type: string, nullable: true }
 *               zekrTask: { type: object, nullable: true }
 *               wirdTask: { type: object, nullable: true }
 *     responses:
 *       201:
 *         description: Task created
 */
/**
 * @swagger
 * /student/zekr-catalog:
 *   get:
 *     summary: Get the complete Zekr catalog (categories and duas) for offline sync
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: Zekr catalog
 */
router.get('/zekr-catalog', studentController.getZekrCatalog);

/**
 * @swagger
 * /student/quran-data:
 *   get:
 *     summary: Get the complete Quran data (chapters and verses) for offline sync
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: Quran data
 */
router.get('/quran-data', studentController.getQuranData);

router.get('/tasks', studentController.getTasks);
router.post('/tasks', studentController.createTask);

/**
 * @swagger
 * /student/tasks/{id}:
 *   patch:
 *     summary: Update a task
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskType: { type: string, enum: ['zekr', 'wird'] }
 *               status: { type: string, enum: ['pending', 'in_progress', 'done', 'missed'] }
 *               zekrTask: { type: object, nullable: true }
 *               wirdTask: { type: object, nullable: true }
 *     responses:
 *       200:
 *         description: Task updated
 *   delete:
 *     summary: Delete a task
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.patch('/tasks/:id', studentController.updateTask);
router.delete('/tasks/:id', studentController.deleteTask);

/**
 * @swagger
 * /student/tasks/complete-study:
 *   post:
 *     summary: Complete study tasks for a specific lecture and activity
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lectureId:
 *                 type: string
 *               activityType:
 *                 type: string
 *                 enum: [watch, solve, revision]
 *     responses:
 *       200:
 *         description: Study tasks completed
 */
router.post('/tasks/complete-study', studentController.completeStudyTasks);

// Reviewables (SRS)
/**
 * @swagger
 * /student/reviewables/due:
 *   get:
 *     summary: Get due reviewable items for the student
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of due reviewable items
 */
router.get('/reviewables/due', studentController.getDueReviewables);

/**
 * @swagger
 * /student/reviewables/sync:
 *   post:
 *     summary: Sync reviewable items from mobile offline queue
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/reviewables/sync', studentController.syncReviewables);

/**
 * @swagger
 * /student/sync:
 *   post:
 *     summary: Bidirectional sync for student-owned items (review items, tasks)
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Cursor for delta sync (optional)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewItems:
 *                 type: array
 *                 items:
 *                   type: object
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Sync results with server changes and next cursor
 */
router.post('/sync', studentSyncController.syncStudentItems);

export { router as studentRoutes };
