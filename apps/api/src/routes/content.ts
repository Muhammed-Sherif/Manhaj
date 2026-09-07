import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../middleware/auth';
import { ContentController } from '../controllers/contentController';

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
 *                 lectures:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lecture'
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Question'
 *                 choices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Choice'
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
 * /content/lectures/{id}/videos:
 *   get:
 *     summary: Get videos for a lecture
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
 *         description: Lecture videos retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LectureVideo'
 */
router.get('/lectures/:id/videos', requireAuth, contentController.getLectureVideos);

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
