import type * as SQLite from 'expo-sqlite';

export const LECTURE_ID = '32c7ebed-0c2c-4b14-a86f-902ee6aa7465';
export const GRADE_ID = 'c649ba3c-d4c5-4328-aa2f-41694651fb7f';
export const TERM_ID = '470a90cd-e35d-486e-8b80-f2a8fb839527';
export const MODULE_ID = '703baaf0-655d-490c-965f-b8ec52ae2b60';
export const SUBJECT_ID = '5172f6e6-b9c5-4839-8f16-b220738d86b5';

export const seedInitialSqliteData = (expoDb: SQLite.SQLiteDatabase) => {
  try {
    // 1. Seed grade
    expoDb.execSync(`
      INSERT OR IGNORE INTO grades (id, name, description)
      VALUES ('${GRADE_ID}', 'Third Year', 'Clinical foundations and systems-based medicine.');
    `);

    // 2. Seed term
    expoDb.execSync(`
      INSERT OR IGNORE INTO terms (id, grade_id, name, description)
      VALUES ('${TERM_ID}', '${GRADE_ID}', 'Term 1', 'First clinical medicine term.');
    `);

    // 3. Seed module
    expoDb.execSync(`
      INSERT OR IGNORE INTO modules (id, term_id, name, description)
      VALUES ('${MODULE_ID}', '${TERM_ID}', 'Clinical Medicine', 'Core organ-system clinical teaching.');
    `);

    // 4. Seed subject
    expoDb.execSync(`
      INSERT OR IGNORE INTO subjects (id, module_id, name)
      VALUES ('${SUBJECT_ID}', '${MODULE_ID}', 'Cardiology');
    `);

    // 5. Seed lecture
    expoDb.execSync(`
      INSERT OR IGNORE INTO lectures (id, subject_id, name, description)
      VALUES ('${LECTURE_ID}', '${SUBJECT_ID}', 'Cardiovascular System - Part 1', 'Foundations of cardiovascular anatomy, physiology, and disease.');
    `);

    // 6. Seed questions & choices
    const questionsWithChoices = [
      {
        id: 'q-cardio-1',
        text: 'Which artery supplies the lateral wall of the left ventricle?',
        explanation: 'The left circumflex artery runs in the atrioventricular groove and supplies the lateral wall of the left ventricle.',
        choices: [
          { id: 'c-cardio-1-1', text: 'Left anterior descending artery', isCorrect: 0 },
          { id: 'c-cardio-1-2', text: 'Right coronary artery', isCorrect: 0 },
          { id: 'c-cardio-1-3', text: 'Left circumflex artery', isCorrect: 1 },
          { id: 'c-cardio-1-4', text: 'Posterior descending artery', isCorrect: 0 },
        ],
      },
      {
        id: 'q-cardio-2',
        text: 'Which node is known as the natural primary pacemaker of the heart?',
        explanation: 'The sinoatrial (SA) node spontaneously generates electrical impulses at 60-100 beats/min, serving as the normal physiological pacemaker.',
        choices: [
          { id: 'c-cardio-2-1', text: 'Sinoatrial (SA) node', isCorrect: 1 },
          { id: 'c-cardio-2-2', text: 'Atrioventricular (AV) node', isCorrect: 0 },
          { id: 'c-cardio-2-3', text: 'Bundle of His', isCorrect: 0 },
          { id: 'c-cardio-2-4', text: 'Purkinje fibers', isCorrect: 0 },
        ],
      },
      {
        id: 'q-cardio-3',
        text: 'Which heart valve prevents backflow of blood from the left ventricle into the left atrium during ventricular systole?',
        explanation: 'The mitral (bicuspid) valve separates the left atrium and left ventricle and closes during systole to prevent regurgitation.',
        choices: [
          { id: 'c-cardio-3-1', text: 'Mitral (bicuspid) valve', isCorrect: 1 },
          { id: 'c-cardio-3-2', text: 'Tricuspid valve', isCorrect: 0 },
          { id: 'c-cardio-3-3', text: 'Aortic semilunar valve', isCorrect: 0 },
          { id: 'c-cardio-3-4', text: 'Pulmonary valve', isCorrect: 0 },
        ],
      },
      {
        id: 'q-cardio-4',
        text: 'What is the primary hemodynamic mechanism of action of sublingual nitroglycerin in relieving angina pectoris?',
        explanation: 'Nitroglycerin promotes nitric oxide release and cGMP formation, causing systemic venodilation that reduces venous return (preload) and myocardial oxygen demand.',
        choices: [
          { id: 'c-cardio-4-1', text: 'Systemic venodilation resulting in reduced preload', isCorrect: 1 },
          { id: 'c-cardio-4-2', text: 'Direct positive inotropy on ventricular myocytes', isCorrect: 0 },
          { id: 'c-cardio-4-3', text: 'Selective blockade of beta-1 adrenergic receptors', isCorrect: 0 },
          { id: 'c-cardio-4-4', text: 'Inhibition of angiotensin-converting enzyme', isCorrect: 0 },
        ],
      },
      {
        id: 'q-cardio-5',
        text: 'During which phase of the cardiac cycle do the coronary arteries primarily receive perfusion?',
        explanation: 'During ventricular systole, myocardial tissue pressure compresses intramural vessels. Therefore, the majority of coronary blood flow occurs during ventricular diastole.',
        choices: [
          { id: 'c-cardio-5-1', text: 'Ventricular diastole', isCorrect: 1 },
          { id: 'c-cardio-5-2', text: 'Isovolumetric ventricular contraction', isCorrect: 0 },
          { id: 'c-cardio-5-3', text: 'Rapid ventricular ejection', isCorrect: 0 },
          { id: 'c-cardio-5-4', text: 'Atrial systole', isCorrect: 0 },
        ],
      },
    ];

    for (const q of questionsWithChoices) {
      const escapedText = q.text.replace(/'/g, "''");
      const escapedExplanation = q.explanation.replace(/'/g, "''");

      expoDb.execSync(`
        INSERT OR REPLACE INTO questions (id, lecture_id, created_by, question_text, explanation, source)
        VALUES ('${q.id}', '${LECTURE_ID}', NULL, '${escapedText}', '${escapedExplanation}', 'admin_manual');
      `);

      for (const c of q.choices) {
        const escapedChoice = c.text.replace(/'/g, "''");
        expoDb.execSync(`
          INSERT OR REPLACE INTO choices (id, question_id, choice_text, is_correct)
          VALUES ('${c.id}', '${q.id}', '${escapedChoice}', ${c.isCorrect});
        `);
      }
    }

    console.log('[SQLite] Successfully seeded cardiology lecture & questions into SQLite.');
  } catch (err) {
    console.warn('[SQLite] Error seeding initial SQLite data:', err);
  }
};
