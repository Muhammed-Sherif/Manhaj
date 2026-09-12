import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  googleAuth = async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const result = await this.authService.googleAuth(idToken);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  register = async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      const result = await this.authService.register(name, email, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  };

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   */
  refresh = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const result = await this.authService.refresh(token);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      await this.authService.logout(token);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
