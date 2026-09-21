import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { ContentController } from '../controllers/contentController.js';

const router: ExpressRouter = Router();
const contentController = new ContentController();

/**
 * @swagger
 * /content/sync:
 *   get:
 *     summary: Sync content for offline use
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Cursor for delta sync (ISO timestamp)
 *     responses:
 *       200:
 *         description: Content sync successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grades:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grade'
 *                 terms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Term'
 *                 modules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Module'
 *                 subjects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *                 studyUnits:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudyUnit'
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Question'
 *                 choices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Choice'
 *                 questionSources:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QuestionSourceTag'
 *                 lectureVideos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LectureVideo'
 *                 lectureFiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LectureFile'
 *                 nextCursor:
 *                   type: string
 *                   format: date-time
 */
router.get('/sync', requireAuth, contentController.syncContent);

/**
 * @swagger
 * /content/hierarchy:
 *   get:
 *     summary: Get complete nested content hierarchy
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     responses:
 *       200:
 *         description: Structured content hierarchy retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StructuredGrade'
 */
router.get('/hierarchy', optionalAuth , contentController.getContentHierarchy);

/**
 * @swagger
 * /content/study-units/{id}:
 *   get:
 *     summary: Get study unit details with videos, files, and questions
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Study unit details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudyUnitDetails'
 *       404:
 *         description: Study unit not found
 */
router.get('/study-units/:id', requireAuth, contentController.getStudyUnitDetails);

/**
 * @swagger
 * /content/study-units/{id}/videos:
 *   get:
 *     summary: Get videos for a study unit
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Study unit videos retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LectureVideo'
 */
router.get('/study-units/:id/videos', requireAuth, contentController.getStudyUnitVideos);

/**
 * @swagger
 * /content/video-progress:
 *   post:
 *     summary: Update video watch progress
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *       - authToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lectureVideoId
 *               - positionSeconds
 *             properties:
 *               lectureVideoId:
 *                 type: string
 *                 format: uuid
 *               positionSeconds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Video progress updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoProgress'
 */
router.post('/video-progress', requireAuth, contentController.updateVideoProgress);

export { router as contentRoutes };
