import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { AdminController } from '../controllers/adminController';

const router: ExpressRouter = Router();
const adminController = new AdminController();

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * @swagger
 * /admin/grades:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [name, description], properties: { name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Grade created }
 */
router.post('/grades', adminController.createGrade);
/**
 * @swagger
 * /admin/grades/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, properties: { name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Grade updated }
 */
router.patch('/grades/:id', adminController.updateGrade);
/**
 * @swagger
 * /admin/terms:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [gradeId, name, description], properties: { gradeId: { type: string }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Term created }
 */
router.post('/terms', adminController.createTerm);
/**
 * @swagger
 * /admin/terms/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, properties: { gradeId: { type: string }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Term updated }
 */
router.patch('/terms/:id', adminController.updateTerm);
/**
 * @swagger
 * /admin/modules:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [termId, name, description], properties: { termId: { type: string }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Module created }
 */
router.post('/modules', adminController.createModule);
/**
 * @swagger
 * /admin/modules/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, properties: { termId: { type: string }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Module updated }
 */
router.patch('/modules/:id', adminController.updateModule);
/**
 * @swagger
 * /admin/subjects:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [moduleId, name], properties: { moduleId: { type: string }, name: { type: string } } } }
 *     responses:
 *       200: { description: Subject created }
 */
router.post('/subjects', adminController.createSubject);
/**
 * @swagger
 * /admin/subjects/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, properties: { moduleId: { type: string }, name: { type: string } } } }
 *     responses:
 *       200: { description: Subject updated }
 */
router.patch('/subjects/:id', adminController.updateSubject);

// Questions
/**
 * @swagger
 * /admin/questions:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: lectureId
 *         schema: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Questions with choices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 */
router.post('/questions', adminController.createQuestion);
router.get('/questions', adminController.getQuestions);
/**
 * @swagger
 * /admin/questions/bulk-assign-lecture:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionIds, lectureId]
 *             properties:
 *               questionIds: { type: array, items: { type: string, format: uuid } }
 *               lectureId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Questions assigned }
 */
router.patch('/questions/bulk-assign-lecture', adminController.bulkAssignLecture);
/**
 * @swagger
 * /admin/questions/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { $ref: '#/components/schemas/Question' } }
 *     responses:
 *       200: { description: Question updated }
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Question deleted }
 */
router.patch('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

// Lectures
/**
 * @swagger
 * /admin/lectures:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [subjectId, name], properties: { subjectId: { type: string, format: uuid }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Lecture created }
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lectures with resources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lecture'
 */
router.post('/lectures', adminController.createLecture);
router.get('/lectures', adminController.getLectures);
/**
 * @swagger
 * /admin/lectures/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, properties: { subjectId: { type: string, format: uuid }, name: { type: string }, description: { type: string } } } }
 *     responses:
 *       200: { description: Lecture updated }
 */
router.patch('/lectures/:id', adminController.updateLecture);
router.post('/lectures/:id/videos', adminController.addLectureVideo);
router.post('/lectures/:id/files', adminController.addLectureFile);

export { router as adminRoutes };
