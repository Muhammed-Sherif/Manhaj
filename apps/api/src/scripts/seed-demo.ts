import { db } from '../config/database.js';
import { choices, grades, lectureFiles, lectureVideos, studyUnits, modules, questions, subjects, terms } from '@manhaj/db';
import { and, eq } from '@manhaj/db';

async function findOrCreateGrade(name: string, description: string) {
  const existing = await db.query.grades.findFirst({ where: eq(grades.name, name) });
  if (existing) return existing;
  const [created] = await db.insert(grades).values({ name, description }).returning();
  return created;
}

async function findOrCreateTerm(gradeId: string, name: string, description: string) {
  const existing = await db.query.terms.findFirst({ where: and(eq(terms.gradeId, gradeId), eq(terms.name, name)) });
  if (existing) return existing;
  const [created] = await db.insert(terms).values({ gradeId, name, description }).returning();
  return created;
}

async function findOrCreateModule(termId: string, name: string, description: string) {
  const existing = await db.query.modules.findFirst({ where: and(eq(modules.termId, termId), eq(modules.name, name)) });
  if (existing) return existing;
  const [created] = await db.insert(modules).values({ termId, name, description }).returning();
  return created;
}

async function findOrCreateSubject(moduleId: string, name: string) {
  const existing = await db.query.subjects.findFirst({ where: and(eq(subjects.moduleId, moduleId), eq(subjects.name, name)) });
  if (existing) return existing;
  const [created] = await db.insert(subjects).values({ moduleId, name }).returning();
  return created;
}

async function findOrCreateLecture(subjectId: string, name: string, description: string) {
  const existing = await db.query.studyUnits.findFirst({ where: and(eq(studyUnits.subjectId, subjectId), eq(studyUnits.name, name)) });
  if (existing) return existing;
  const [created] = await db.insert(studyUnits).values({ subjectId, name, description }).returning();
  return created;
}

async function main() {
  const grade = await findOrCreateGrade('Second Year', 'Clinical foundations and systems-based medicine.');
  const term = await findOrCreateTerm(grade.id, 'Term 1', 'First clinical medicine term.');
  const module = await findOrCreateModule(term.id, 'Clinical Medicine', 'Core organ-system clinical teaching.');
  const subject = await findOrCreateSubject(module.id, 'Cardiology');
  const lecture = await findOrCreateLecture(subject.id, 'Cardiovascular System - Part 1', 'Foundations of cardiovascular anatomy, physiology, and disease.');

  const existingVideo = await db.query.lectureVideos.findFirst({ where: eq(lectureVideos.studyUnitId, lecture.id) });
  if (!existingVideo) {
    await db.insert(lectureVideos).values({ studyUnitId: lecture.id, sourceName: 'Cardiovascular lecture video', url: 'https://example.com/videos/cardiovascular-system-part-1.mp4', duration: 2700 });
  }

  const existingFile = await db.query.lectureFiles.findFirst({ where: eq(lectureFiles.studyUnitId, lecture.id) });
  if (!existingFile) {
    await db.insert(lectureFiles).values({ studyUnitId: lecture.id, sourceName: 'Cardiovascular notes', fileUrl: 'https://example.com/files/cardiovascular-system-part-1.pdf', fileType: 'application/pdf' });
  }

  const questionText = 'Which artery supplies the lateral wall of the left ventricle?';
  let question = await db.query.questions.findFirst({ where: eq(questions.questionText, questionText) });
  if (!question) {
    const [created] = await db.insert(questions).values({ studyUnitId: lecture.id, questionText, explanation: 'The left circumflex artery runs in the atrioventricular groove and supplies the lateral wall of the left ventricle.', source: 'admin_manual' }).returning();
    question = created;
    await db.insert(choices).values([
      { questionId: question.id, choiceText: 'Left anterior descending artery', isCorrect: false },
      { questionId: question.id, choiceText: 'Right coronary artery', isCorrect: false },
      { questionId: question.id, choiceText: 'Left circumflex artery', isCorrect: true },
      { questionId: question.id, choiceText: 'Posterior descending artery', isCorrect: false },
    ]);
  }

  console.log(`Seeded demo content: ${grade.name} / ${term.name} / ${module.name} / ${subject.name} / ${lecture.name}`);
}

void main();
