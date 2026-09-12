/**
 * Implementation of the SM-2 spaced repetition algorithm.
 * Based on SuperMemo-2 algorithm: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SM2Item {
  repetitionCount: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
}

/**
 * Calculates the next review date and parameters for an item based on its grade.
 * 
 * @param grade - Grade from 0 to 5
 *  5 - perfect response
 *  4 - correct response after a hesitation
 *  3 - correct response recalled with serious difficulty
 *  2 - incorrect response; where the correct one seemed easy to recall
 *  1 - incorrect response; the correct one remembered
 *  0 - complete blackout
 * @param item - Current SM2 parameters of the item
 * @returns Updated SM2 parameters
 */
export function calculateSM2(grade: number, item: Omit<SM2Item, 'nextReviewDate'>): SM2Item {
  let { repetitionCount, easeFactor, interval } = item;

  if (grade >= 3) {
    // Correct response
    if (repetitionCount === 0) {
      interval = 1;
    } else if (repetitionCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitionCount += 1;
  } else {
    // Incorrect response
    repetitionCount = 0;
    interval = 1;
  }

  // Calculate new ease factor
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  
  // Ease factor cannot be lower than 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitionCount,
    easeFactor,
    interval,
    nextReviewDate,
  };
}
