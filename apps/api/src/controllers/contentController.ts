import { Request, Response } from 'express';
import { ContentService } from '../services/contentService';

export class ContentController {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  syncContent = async (req: Request, res: Response) => {
    try {
      const { since } = req.query;
      const content = await this.contentService.syncContent(since as string | undefined);
      res.json(content);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getContentHierarchy = async (_req: Request, res: Response) => {
    try {
      const hierarchy = await this.contentService.getContentHierarchy();
      res.json(hierarchy);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getLectureDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lecture = await this.contentService.getLectureDetails(id);
      if (!lecture) {
        return res.status(404).json({ error: 'Lecture not found' });
      }
      res.json(lecture);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getLectureVideos = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const videos = await this.contentService.getLectureVideos(id);
      res.json(videos);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  updateVideoProgress = async (req: Request, res: Response) => {
    try {
      const { lectureVideoId, positionSeconds } = req.body;
      const userId = req.user!.id;
      const progress = await this.contentService.updateVideoProgress(
        userId,
        lectureVideoId,
        positionSeconds
      );
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
