import { Request, Response } from 'express';
import {
  AdminConflictError,
  AdminNotFoundError,
  AdminValidationError,
  AdminService,
} from '../services/adminService.js';
import { videoUploadService } from '../services/videoUploadService.js';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  getGrades = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.getGrades()); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  createGrade = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createGrade(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateGrade = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateGrade(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  getTerms = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.getTerms(req.query.gradeId as string | undefined)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  createTerm = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createTerm(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateTerm = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateTerm(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  getModules = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.getModules(req.query.termId as string | undefined)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  createModule = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createModule(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateModule = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateModule(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  getSubjects = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.getSubjects(req.query.moduleId as string | undefined)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  createSubject = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createSubject(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateSubject = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateSubject(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  deleteGrade = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteGrade(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteTerm = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteTerm(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteModule = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteModule(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteSubject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteSubject(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteLecture = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteLecture(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // Questions
  createQuestion = async (req: Request, res: Response) => {
    try {
      const questionData = req.body;
      if (Array.isArray(questionData)) {
        const created = [];
        for (const item of questionData) {
          created.push(await this.adminService.createQuestion(item));
        }
        return res.json(created);
      }
      const question = await this.adminService.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      if (error instanceof AdminConflictError || error instanceof AdminValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getQuestions = async (req: Request, res: Response) => {
    try {
      const { lectureId } = req.query;
      const questions = await this.adminService.getQuestions(
        lectureId as string | undefined
      );
      res.json(questions);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  bulkAssignLecture = async (req: Request, res: Response) => {
    try {
      const { questionIds, lectureId } = req.body;
      const result = await this.adminService.bulkAssignLecture(questionIds, lectureId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  bulkUnassignLecture = async (req: Request, res: Response) => {
    try {
      const { questionIds } = req.body;
      const result = await this.adminService.bulkUnassignLecture(questionIds);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateQuestion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const question = await this.adminService.updateQuestion(id, updates);
      res.json(question);
    } catch (error) {
      if (error instanceof AdminConflictError || error instanceof AdminValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteQuestion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.adminService.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // Lectures
  createLecture = async (req: Request, res: Response) => {
    try {
      const lectureData = req.body;
      const lecture = await this.adminService.createLecture(lectureData);
      res.json(lecture);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateLecture = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lecture = await this.adminService.updateLecture(id, req.body);
      res.json(lecture);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getLectures = async (req: Request, res: Response) => {
    try {
      const { subjectId } = req.query;
      const lectures = await this.adminService.getLectures(subjectId as string | undefined);
      res.json(lectures);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  addLectureVideo = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const videoData = req.body;
      const video = await this.adminService.addLectureVideo(id, videoData);
      res.json(video);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  addLectureFile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const fileData = req.body;
      const file = await this.adminService.addLectureFile(id, fileData);
      res.json(file);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getProfile = async (req: Request, res: Response) => {
    try {
      const user = await this.adminService.getProfile(req.user!.id);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    try {
      const user = await this.adminService.updateProfile(req.user!.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // User Management
  getUsers = async (req: Request, res: Response) => {
    try {
      const users = await this.adminService.getUsers();
      res.json(users);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  createUser = async (req: Request, res: Response) => {
    try {
      const user = await this.adminService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await this.adminService.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      if (error instanceof AdminConflictError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Prevent users from deleting themselves
      if (id === req.user?.id) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const result = await this.adminService.deleteUser(id);
      res.json(result);
    } catch (error) {
      if (error instanceof AdminConflictError || error instanceof AdminNotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: (error as Error).message });
    }
  };

  initVideoUpload = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { sourceName, fileSize, chunkSize } = req.body;
      const result = await videoUploadService.initUpload(id, { sourceName, fileSize, chunkSize });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getVideoUploadStatus = async (req: Request, res: Response) => {
    try {
      const { id, uploadId } = req.params;
      const status = await videoUploadService.getUploadStatus(id, uploadId);
      res.json(status);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  uploadVideoChunk = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndexStr = req.headers['x-chunk-index'] as string;
      const contentLengthHeader = req.headers['content-length'];

      if (!uploadId) {
        res.status(400).json({ error: 'Missing x-upload-id header' });
        return;
      }
      if (chunkIndexStr === undefined) {
        res.status(400).json({ error: 'Missing x-chunk-index header' });
        return;
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);
      if (isNaN(chunkIndex)) {
        res.status(400).json({ error: 'Invalid x-chunk-index header' });
        return;
      }

      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

      const result = await videoUploadService.saveChunkStream(
        id,
        uploadId,
        chunkIndex,
        contentLength,
        req
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  completeVideoUpload = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { uploadId, duration } = req.body;

      if (!uploadId) {
        res.status(400).json({ error: 'Missing uploadId in body' });
        return;
      }

      const video = await videoUploadService.finalizeUpload(id, uploadId, duration);
      res.status(201).json(video);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };


}

