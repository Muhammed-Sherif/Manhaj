import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Manhaj API',
      version: '1.0.0',
      description: 'Offline-First Student Question Bank API',
    },
    servers: [
      {
        url: 'https://manhaj-api-five.vercel.app',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        authToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-auth-token',
        },
      },
      schemas: {
        StructuredSubject: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            moduleId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            lectures: {
              type: 'array',
              items: { $ref: '#/components/schemas/Lecture' },
            },
          },
        },
        StructuredModule: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            termId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            subjects: {
              type: 'array',
              items: { $ref: '#/components/schemas/StructuredSubject' },
            },
          },
        },
        StructuredTerm: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            gradeId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            modules: {
              type: 'array',
              items: { $ref: '#/components/schemas/StructuredModule' },
            },
          },
        },
        StructuredGrade: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            terms: {
              type: 'array',
              items: { $ref: '#/components/schemas/StructuredTerm' },
            },
          },
        },
        Grade: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Term: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            gradeId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Module: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            termId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Subject: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            moduleId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Lecture: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            subjectId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LectureDetails: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            subjectId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            subject: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
              },
            },
            lectureVideos: {
              type: 'array',
              items: { $ref: '#/components/schemas/LectureVideo' },
            },
            lectureFiles: {
              type: 'array',
              items: { $ref: '#/components/schemas/LectureFile' },
            },
            questions: {
              type: 'array',
              items: { $ref: '#/components/schemas/Question' },
            },
          },
        },
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            source: { type: 'string', enum: ['manual', 'imported'] },
            text: { type: 'string' },
            explanation: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Choice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            text: { type: 'string' },
            isCorrect: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // Note: named `QuestionSourceTag` rather than `QuestionSource` because the latter is
        // already taken by the enum generated for `Question.source` (ingestion provenance).
        // This is the *clinical* provenance — why a question is worth studying.
        QuestionSourceTag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            sourceType: {
              type: 'string',
              enum: [
                'previous_exam',
                'doctor_confirmation',
                'owner',
                'team_expectation',
              ],
            },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        LectureVideo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            url: { type: 'string' },
            duration: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LectureFile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            url: { type: 'string' },
            type: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        VideoProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            videoId: { type: 'string', format: 'uuid' },
            currentTime: { type: 'number' },
            completed: { type: 'boolean' },
            lastWatchedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string', enum: ['student', 'admin'] },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

const outputPath = path.join(__dirname, '../../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log('OpenAPI spec generated at', outputPath);
