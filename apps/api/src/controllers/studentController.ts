import { Request, Response } from 'express';
import { StudentService } from '../services/studentService.js';

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

  getUnsolvedQuestions = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { lectureId } = req.query;
      if (!lectureId) {
        res.status(400).json({ error: 'lectureId is required' });
        return;
      }
      const questions = await this.studentService.getUnsolvedQuestions(userId, lectureId as string);
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

  // --- Cases ---
  getCases = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getCases(req.user!.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  createCase = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.studentService.createCase(req.user!.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateCase = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.updateCase(req.user!.id, req.params.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteCase = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.deleteCase(req.user!.id, req.params.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // --- Notes ---
  getNotes = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getNotes(req.user!.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  createNote = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.studentService.createNote(req.user!.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateNote = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.updateNote(req.user!.id, req.params.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteNote = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.deleteNote(req.user!.id, req.params.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // --- Zekr Catalog ---
  getZekrCatalog = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getZekrCatalog());
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // --- Tasks ---

  getTasks = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getTasks(req.user!.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  createTask = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.studentService.createTask(req.user!.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateTask = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.updateTask(req.user!.id, req.params.id, req.body));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  deleteTask = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.deleteTask(req.user!.id, req.params.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  completeStudyTasks = async (req: Request, res: Response) => {
    try {
      const { lectureId, activityType } = req.body;
      res.json(await this.studentService.completeStudyTasks(req.user!.id, lectureId, activityType));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  // --- Reviewables (SRS) ---

  getDueReviewables = async (req: Request, res: Response) => {
    try {
      res.json(await this.studentService.getDueReviewables(req.user!.id));
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  syncReviewables = async (req: Request, res: Response) => {
    try {
      const result = await this.studentService.syncReviewables(req.user!.id, req.body.items);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getQuranData = async (req: Request, res: Response) => {
    try {
      const data = await this.studentService.getQuranData();
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
