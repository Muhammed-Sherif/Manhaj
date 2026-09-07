import { Request, Response } from 'express';
import { AdminConflictError, AdminService } from '../services/adminService';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  createGrade = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createGrade(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateGrade = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateGrade(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
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

  createModule = async (req: Request, res: Response) => {
    try { res.json(await this.adminService.createModule(req.body)); } catch (error) { res.status(400).json({ error: (error as Error).message }); }
  };

  updateModule = async (req: Request, res: Response) => {
    try { 
      const { id } = req.params;
      res.json(await this.adminService.updateModule(id, req.body)); 
    } catch (error) { res.status(400).json({ error: (error as Error).message }); }
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

  // Questions
  createQuestion = async (req: Request, res: Response) => {
    try {
      const questionData = req.body;
      const question = await this.adminService.createQuestion(questionData);
      res.json(question);
    } catch (error) {
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

  updateQuestion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const question = await this.adminService.updateQuestion(id, updates);
      res.json(question);
    } catch (error) {
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
}
