import { Request, Response } from 'express';
import { StudentSyncService } from '../services/studentSyncService.js';

export class StudentSyncController {
  private studentSyncService: StudentSyncService;

  constructor() {
    this.studentSyncService = new StudentSyncService();
  }

  syncStudentItems = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { since } = req.query;
      const clientChanges = req.body;

      const result = await this.studentSyncService.syncStudentItems(
        userId,
        since as string | undefined,
        clientChanges
      );

      res.json(result);
    } catch (error: any) {
      console.error('[StudentSyncController] error:', error?.message, 'cause:', error?.cause?.message ?? error?.cause);
      res.status(400).json({ error: error?.cause?.message ?? error?.message });
    }
  };
}