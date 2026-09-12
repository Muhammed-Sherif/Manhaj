import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { FlagIcon } from 'lucide-react-native';
import {
  isQuestionFlagged,
  storeFlag,
  removeFlag,
  syncFlags,
} from '../../services/syncService';

export interface QuestionFlagButtonProps {
  questionId?: string | null;
  isOnline?: boolean;
  onFlagChange?: (isFlagged: boolean) => void;
  className?: string;
}

export const QuestionFlagButton: React.FC<QuestionFlagButtonProps> = ({
  questionId,
  isOnline = true,
  onFlagChange,
  className = '',
}) => {
  const [isFlagged, setIsFlagged] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (questionId) {
      isQuestionFlagged(questionId)
        .then((flagged) => {
          if (isMounted) setIsFlagged(flagged);
        })
        .catch(() => {
          if (isMounted) setIsFlagged(false);
        });
    } else {
      setIsFlagged(false);
    }
    return () => {
      isMounted = false;
    };
  }, [questionId]);

  const handleToggleFlag = async () => {
    if (!questionId) return;

    const nextFlagState = !isFlagged;
    setIsFlagged(nextFlagState);
    onFlagChange?.(nextFlagState);

    try {
      if (nextFlagState) {
        await storeFlag(questionId);
      } else {
        await removeFlag(questionId);
      }

      if (isOnline) {
        syncFlags().catch((err) => console.warn('Sync flags failed:', err));
      }
    } catch (error) {
      console.error('Failed to toggle flag:', error);
      setIsFlagged(!nextFlagState);
      onFlagChange?.(!nextFlagState);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleToggleFlag}
      activeOpacity={0.7}
      className={`p-2 rounded-full ${
        isFlagged 
          ? 'bg-amber-100 dark:bg-amber-900/30' 
          : 'bg-slate-100 dark:bg-slate-700'
      } ${className}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={isFlagged ? 'Remove flag' : 'Flag question'}
    >
      <FlagIcon
        size={20}
        color={isFlagged ? '#f59e0b' : '#94a3b8'}
        fill={isFlagged ? '#f59e0b' : 'none'}
      />
    </TouchableOpacity>
  );
};
