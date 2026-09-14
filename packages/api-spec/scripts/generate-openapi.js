const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

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
            lectureId: { type: 'string', format: 'uuid', nullable: true },
            createdBy: { type: 'string', format: 'uuid', nullable: true },
            questionText: { type: 'string' },
            explanation: { type: 'string' },
            source: { type: 'string', enum: ['telegram_auto', 'admin_manual'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Choice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            choiceText: { type: 'string' },
            isCorrect: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LectureVideo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            sourceName: { type: 'string' },
            url: { type: 'string' },
            duration: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LectureFile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lectureId: { type: 'string', format: 'uuid' },
            sourceName: { type: 'string' },
            fileUrl: { type: 'string' },
            fileType: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        VideoProgress: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            lectureVideoId: { type: 'string', format: 'uuid' },
            positionSeconds: { type: 'integer' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            authProvider: { type: 'string', enum: ['google', 'credentials'] },
            role: { type: 'string', enum: ['student', 'admin'] },
            termId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Attempt: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
            choiceId: { type: 'string', format: 'uuid' },
            isCorrect: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Flag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            questionId: { type: 'string', format: 'uuid' },
          },
        },
        SyncAttemptResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            synced: { type: 'boolean' },
            reason: { type: 'string' },
          },
        },
        StudentProfile: {
          type: 'object',
          properties: {
            termId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        GradeWithTerms: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            terms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        Zekr: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            text: { type: 'string' },
            transliteration: { type: 'string' },
            meaning: { type: 'string' },
            source: { type: 'string' },
            defaultCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['../../apps/api/src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

const outputPath = path.join(__dirname, '../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log('OpenAPI spec generated at', outputPath);
