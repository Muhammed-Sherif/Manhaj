import { Request, Response } from 'express';
import { StudentService } from '../services/studentService';

export class StudentController {
  private studentService: StudentService;

  constructor() {
    this.studentService = new StudentService();
  }

  getProfile = async (req: Request, res: Response) => {
    try {
      const profile = await this.studentService.getProfile(req.user!.id);
      res.json(profile);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    try {
      const profile = await this.studentService.updateProfile(req.user!.id, req.body.termId ?? null);
      res.json(profile);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getGradesWithTerms = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getGradesWithTerms());
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  syncAttempts = async (req: Request, res: Response) => {
    try {
      const { attempts } = req.body;
      const userId = req.user!.id;
      const result = await this.studentService.syncAttempts(userId, attempts);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getWrongOrFlagged = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const questions = await this.studentService.getWrongOrFlagged(userId);
      res.json(questions);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  createFlag = async (req: Request, res: Response) => {
    try {
      const { questionId } = req.body;
      const userId = req.user!.id;
      const flag = await this.studentService.createFlag(userId, questionId);
      res.json(flag);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteFlag = async (req: Request, res: Response) => {
    try {
      const { questionId } = req.params;
      const userId = req.user!.id;
      await this.studentService.deleteFlag(userId, questionId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  registerDeviceToken = async (req: Request, res: Response) => {
    try {
      const { pushToken, platform } = req.body;
      const deviceToken = await this.studentService.registerDeviceToken(
        req.user!.id,
        pushToken,
        platform
      );
      res.json(deviceToken);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  unregisterDeviceToken = async (req: Request, res: Response) => {
    try {
      const { pushToken } = req.body;
      await this.studentService.unregisterDeviceToken(req.user!.id, pushToken);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
