import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AdminController } from '../controllers/adminController.js';

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
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of grades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grade'
 */
router.post('/grades', adminController.createGrade);
router.get('/grades', adminController.getGrades);
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
 * /admin/grades/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Grade deleted }
 *       409: { description: Cannot delete grade with dependencies }
 */
router.delete('/grades/:id', adminController.deleteGrade);
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
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: gradeId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Term'
 */
router.post('/terms', adminController.createTerm);
router.get('/terms', adminController.getTerms);
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
 * /admin/terms/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Term deleted }
 *       409: { description: Cannot delete term with dependencies }
 */
router.delete('/terms/:id', adminController.deleteTerm);
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
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: termId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of modules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Module'
 */
router.post('/modules', adminController.createModule);
router.get('/modules', adminController.getModules);
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
 * /admin/modules/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Module deleted }
 *       409: { description: Cannot delete module with dependencies }
 */
router.delete('/modules/:id', adminController.deleteModule);
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
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: moduleId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
 */
router.post('/subjects', adminController.createSubject);
router.get('/subjects', adminController.getSubjects);
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
/**
 * @swagger
 * /admin/subjects/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Subject deleted }
 *       409: { description: Cannot delete subject with dependencies }
 */
router.delete('/subjects/:id', adminController.deleteSubject);

// Questions
/**
 * @swagger
 * /admin/questions:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: studyUnitId
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
 * /admin/questions/bulk-assign-study-unit:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionIds, studyUnitId]
 *             properties:
 *               questionIds: { type: array, items: { type: string, format: uuid } }
 *               studyUnitId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Questions assigned }
 */
router.patch('/questions/bulk-assign-study-unit', adminController.bulkAssignStudyUnit);
/**
 * @swagger
 * /admin/questions/bulk-assign-telegram-range:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startMessageId, endMessageId, studyUnitId]
 *             properties:
 *               startMessageId: { type: integer }
 *               endMessageId: { type: integer }
 *               studyUnitId: { type: string, format: uuid }
 *               sourceTypes: 
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [previous_exam, doctor_confirmation, owner, team_expectation]
 *     responses:
 *       200: { description: Questions assigned }
 */
router.patch('/questions/bulk-assign-telegram-range', adminController.bulkAssignTelegramRange);
/**
 * @swagger
 * /admin/questions/bulk-unassign-study-unit:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionIds]
 *             properties:
 *               questionIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Questions unassigned }
 */
router.patch('/questions/bulk-unassign-study-unit', adminController.bulkUnassignStudyUnit);
/**
 * @swagger
 * /admin/questions/bulk-delete:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionIds]
 *             properties:
 *               questionIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Questions soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 deletedCount: { type: integer }
 */
router.post('/questions/bulk-delete', adminController.deleteQuestions);
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

// Study Units
/**
 * @swagger
 * /admin/study-units:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: { schema: { type: object, required: [subjectId, name], properties: { subjectId: { type: string, format: uuid }, name: { type: string }, description: { type: string }, type: { type: string, enum: [lecture, section] }, order: { type: integer } } } }
 *     responses:
 *       200: { description: Study unit created }
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [lecture, section] }
 *     responses:
 *       200:
 *         description: Study units with resources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudyUnit'
 */
router.post('/study-units', adminController.createStudyUnit);
router.get('/study-units', adminController.getStudyUnits);
/**
 * @swagger
 * /admin/study-units/{id}:
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
 *         application/json: { schema: { type: object, properties: { subjectId: { type: string, format: uuid }, name: { type: string }, description: { type: string }, type: { type: string, enum: [lecture, section] }, order: { type: integer } } } }
 *     responses:
 *       200: { description: Study unit updated }
 */
router.patch('/study-units/:id', adminController.updateStudyUnit);
/**
 * @swagger
 * /admin/study-units/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Study unit deleted }
 *       409: { description: Cannot delete study unit with dependencies }
 */
router.delete('/study-units/:id', adminController.deleteStudyUnit);

/**
 * @swagger
 * /admin/study-units/{id}/videos:
 *   post:
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceName, url]
 *             properties:
 *               sourceName: { type: string }
 *               url: { type: string }
 *               duration: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Video added to study unit
 */
router.post('/study-units/:id/videos', adminController.addStudyUnitVideo);
router.post('/study-units/:id/videos/upload/init', adminController.initVideoUpload);
router.get('/study-units/:id/videos/upload/:uploadId/status', adminController.getVideoUploadStatus);
router.post('/study-units/:id/videos/upload/chunk', adminController.uploadVideoChunk);
router.post('/study-units/:id/videos/upload/complete', adminController.completeVideoUpload);

/**
 * @swagger
 * /admin/study-units/{id}/files:
 *   post:
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceName, fileUrl, fileType]
 *             properties:
 *               sourceName: { type: string }
 *               fileUrl: { type: string }
 *               fileType: { type: string }
 *     responses:
 *       200:
 *         description: File or audio added to study unit
 */
router.post('/study-units/:id/files', adminController.addStudyUnitFile);

/**
 * @swagger
 * /admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: Admin profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 email: { type: string, format: email }
 *                 role: { type: string }
 *   patch:
 *     summary: Update admin profile
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile', adminController.getProfile);
router.patch('/profile', adminController.updateProfile);

// User Management
/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   email: { type: string, format: email }
 *                   role: { type: string }
 *                   termId: { type: string, format: uuid }
 *                   termName: { type: string }
 *                   gradeId: { type: string, format: uuid }
 *                   gradeName: { type: string }
 *                   createdAt: { type: string, format: date-time }
 *                   updatedAt: { type: string, format: date-time }
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, student] }
 *               termId: { type: string, format: uuid }
 *     responses:
 *       201: { description: User created }
 *       409: { description: User with this email already exists }
 */
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);

/**
 * @swagger
 * /admin/users/{id}:
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, student] }
 *               termId: { type: string, format: uuid }
 *     responses:
 *       200: { description: User updated }
 *       409: { description: Email already in use }
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }, { authToken: [] }]
 *     summary: Delete a user account
 *     description: Permanently deletes a user and all their associated data (sessions, accounts, tokens, etc.)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User deleted successfully }
 *       400: { description: Cannot delete your own account or last admin }
 *       404: { description: User not found }
 */
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

export { router as adminRoutes };
