import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { BrainCircuitIcon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema.js';
import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../../store/authStore';

export interface QuestionSRSButtonProps {
  questionId?: string | null;
  className?: string;
}

export const QuestionSRSButton: React.FC<QuestionSRSButtonProps> = ({
  questionId,
  className = '',
}) => {
  const [isInSRS, setIsInSRS] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (questionId) {
      db.select()
        .from(schema.questionReviewable)
        .where(eq(schema.questionReviewable.questionId, questionId))
        .then((rows) => {
          if (isMounted) setIsInSRS(rows.length > 0);
        })
        .catch(() => {
          if (isMounted) setIsInSRS(false);
        });
    } else {
      setIsInSRS(false);
    }
    return () => {
      isMounted = false;
    };
  }, [questionId]);

  const handleToggleSRS = async () => {
    if (!questionId) return;

    if (isInSRS) {
      try {
        const rows = await db.select().from(schema.questionReviewable).where(eq(schema.questionReviewable.questionId, questionId));
        if (rows.length > 0) {
          await db.delete(schema.reviewableItems).where(eq(schema.reviewableItems.id, rows[0].reviewableId));
        }
        setIsInSRS(false);
      } catch (err) {
         Alert.alert('Error', 'Failed to remove from SRS.');
      }
      return;
    }

    try {
      const reviewableId = Crypto.randomUUID();
      const card = newCard();
      
      await db.insert(schema.reviewableItems).values({
        id: reviewableId,
        userId: useAuthStore.getState().user?.id ?? 'temp_user_id',
        itemType: 'question',
        state: card.state,
        currentStepIndex: card.currentStepIndex,
        interval: card.interval,
        easeFactor: card.easeFactor,
        repetitionCount: card.repetitionCount,
        lapses: card.lapses,
        nextReviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await db.insert(schema.questionReviewable).values({
        reviewableId: reviewableId,
        questionId: questionId,
      });
      
      setIsInSRS(true);
      Alert.alert('Success', 'Question added to your SRS reviews!');
    } catch (error) {
      console.error('Failed to add to SRS:', error);
      Alert.alert('Error', 'Failed to add question to SRS.');
    }
  };

  return (
    <TouchableOpacity
      onPress={handleToggleSRS}
      activeOpacity={0.7}
      className={`p-2 rounded-full ${
        isInSRS 
          ? 'bg-teal-100 dark:bg-teal-900/30' 
          : 'bg-slate-100 dark:bg-slate-700'
      } ${className}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={isInSRS ? 'Remove from SRS' : 'Add to SRS'}
    >
      <BrainCircuitIcon
        size={20}
        color={isInSRS ? '#0d9488' : '#94a3b8'}
      />
    </TouchableOpacity>
  );
};
