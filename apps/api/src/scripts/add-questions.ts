import { db } from '../config/database.js';
import { choices, lectures, questions } from '@manhaj/db';
import { eq } from 'drizzle-orm';

interface QuestionSeed {
  questionText: string;
  explanation: string;
  choices: { text: string; isCorrect: boolean }[];
}

const newQuestions: QuestionSeed[] = [
  {
    questionText: 'Which node is known as the natural primary pacemaker of the heart?',
    explanation:
      'The sinoatrial (SA) node spontaneously generates electrical impulses at 60-100 beats/min, serving as the normal physiological pacemaker.',
    choices: [
      { text: 'Sinoatrial (SA) node', isCorrect: true },
      { text: 'Atrioventricular (AV) node', isCorrect: false },
      { text: 'Bundle of His', isCorrect: false },
      { text: 'Purkinje fibers', isCorrect: false },
    ],
  },
  {
    questionText: 'Which heart valve prevents backflow of blood from the left ventricle into the left atrium during ventricular systole?',
    explanation:
      'The mitral (bicuspid) valve separates the left atrium and left ventricle and closes during systole to prevent regurgitation.',
    choices: [
      { text: 'Mitral (bicuspid) valve', isCorrect: true },
      { text: 'Tricuspid valve', isCorrect: false },
      { text: 'Aortic semilunar valve', isCorrect: false },
      { text: 'Pulmonary valve', isCorrect: false },
    ],
  },
  {
    questionText: 'What is the primary hemodynamic mechanism of action of sublingual nitroglycerin in relieving angina pectoris?',
    explanation:
      'Nitroglycerin promotes nitric oxide release and cGMP formation, causing systemic venodilation that reduces venous return (preload) and myocardial oxygen demand.',
    choices: [
      { text: 'Systemic venodilation resulting in reduced preload', isCorrect: true },
      { text: 'Direct positive inotropy on ventricular myocytes', isCorrect: false },
      { text: 'Selective blockade of beta-1 adrenergic receptors', isCorrect: false },
      { text: 'Inhibition of angiotensin-converting enzyme', isCorrect: false },
    ],
  },
  {
    questionText: 'During which phase of the cardiac cycle do the coronary arteries primarily receive perfusion?',
    explanation:
      'During ventricular systole, myocardial tissue pressure compresses intramural vessels. Therefore, the majority of coronary blood flow occurs during ventricular diastole.',
    choices: [
      { text: 'Ventricular diastole', isCorrect: true },
      { text: 'Isovolumetric ventricular contraction', isCorrect: false },
      { text: 'Rapid ventricular ejection', isCorrect: false },
      { text: 'Atrial systole', isCorrect: false },
    ],
  },
];

async function addQuestions() {
  // Find "Cardiovascular System - Part 1" lecture
  const lecture = await db.query.lectures.findFirst({
    where: eq(lectures.name, 'Cardiovascular System - Part 1'),
  });

  if (!lecture) {
    console.error('Lecture "Cardiovascular System - Part 1" not found!');
    process.exit(1);
  }

  console.log(`Found lecture: ${lecture.name} (id: ${lecture.id})`);

  let addedCount = 0;
  for (const q of newQuestions) {
    const existing = await db.query.questions.findFirst({
      where: eq(questions.questionText, q.questionText),
    });

    if (existing) {
      console.log(`Question already exists: "${q.questionText}"`);
      continue;
    }

    const [createdQuestion] = await db
      .insert(questions)
      .values({
        studyUnitId: lecture.id,
        questionText: q.questionText,
        explanation: q.explanation,
        source: 'admin_manual',
      })
      .returning();

    await db.insert(choices).values(
      q.choices.map((c) => ({
        questionId: createdQuestion.id,
        choiceText: c.text,
        isCorrect: c.isCorrect,
      }))
    );

    addedCount++;
    console.log(`Added question: "${q.questionText}" with ${q.choices.length} choices.`);
  }

  // Count total questions for lecture
  const allQuestions = await db.query.questions.findMany({
    where: eq(questions.studyUnitId, lecture.id),
  });

  console.log(`Done! Lecture now has ${allQuestions.length} questions (added ${addedCount} new).`);
  process.exit(0);
}

void addQuestions();
