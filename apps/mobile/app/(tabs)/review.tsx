import { ScreenContainer } from '../../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { XCircleIcon, FlagIcon, CheckCircleIcon, BookOpenIcon, FilterIcon, CheckSquareIcon, SquareIcon, PlusIcon, ListChecksIcon } from 'lucide-react-native';
import { getWrongOrFlaggedQuestions } from '../../services/syncService';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import Modal from '../../components/Modal';
import * as Crypto from 'expo-crypto';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../../store/authStore';

type FilterType = 'all' | 'wrong' | 'flagged';

export default function ReviewScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedStudyUnit, setSelectedStudyUnit] = useState<string>('All');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionChoices, setQuestionChoices] = useState<Map<string, any[]>>(new Map());
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    try {
      const allQuestions = await getWrongOrFlaggedQuestions();
      const filtered = allQuestions.filter((q: any) => {
        if (filter === 'all') return true;
        return q.reason === filter;
      });
      setQuestions(filtered);

      // Load all choices for questions
      const choicesMap = new Map<string, any[]>();

      for (const question of filtered) {
        // Get all choices for the question
        try {
          const choices = await db.
          select().
          from(schema.choices).
          where(eq(schema.choices.questionId, question.id));

          if (choices.length > 0) {
            choicesMap.set(question.id, choices);
          }
        } catch (error) {
          console.warn('Failed to get choices:', error);
        }
      }
      setQuestionChoices(choicesMap);
    } catch (error) {
      console.error('Failed to load review questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableSubjects = React.useMemo(() => {
    const subjects = new Set<string>();
    questions.forEach((q) => subjects.add(q.subjectName || 'General Practice'));
    return ['All', ...Array.from(subjects)];
  }, [questions]);

  const availableStudyUnits = React.useMemo(() => {
    if (selectedSubject === 'All') return ['All'];
    const units = new Set<string>();
    questions.forEach((q) => {
      if ((q.subjectName || 'General Practice') === selectedSubject && q.studyUnitName) {
        units.add(q.studyUnitName);
      }
    });
    return ['All', ...Array.from(units)];
  }, [questions, selectedSubject]);

  useEffect(() => {
    if (selectedSubject !== 'All' && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject('All');
      setSelectedStudyUnit('All');
    }
  }, [availableSubjects, selectedSubject]);

  useEffect(() => {
    if (selectedStudyUnit !== 'All' && !availableStudyUnits.includes(selectedStudyUnit)) {
      setSelectedStudyUnit('All');
    }
  }, [availableStudyUnits, selectedStudyUnit]);

  const displayQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      if (selectedSubject !== 'All' && (q.subjectName || 'General Practice') !== selectedSubject) return false;
      if (selectedStudyUnit !== 'All' && q.studyUnitName !== selectedStudyUnit) return false;
      return true;
    });
  }, [questions, selectedSubject, selectedStudyUnit]);

  const FilterPill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-1.5 rounded-full border mb-2 mr-2 ${
        active 
          ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800' 
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <Text className={`font-medium text-sm ${
        active ? 'text-teal-800 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === displayQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(displayQuestions.map(q => q.id)));
    }
  };

  const handleAddToSRS = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      const nowStr = new Date().toISOString();
      const userId = useAuthStore.getState().user?.id ?? 'temp_user_id';
      let addedCount = 0;
      
      for (const qId of ids) {
        const existing = await db.select().from(schema.questionReviewable).where(eq(schema.questionReviewable.questionId, qId));
        if (existing.length > 0) continue;
        
        const reviewableId = Crypto.randomUUID();
        const card = newCard();
        
        await db.insert(schema.reviewableItems).values({
          id: reviewableId,
          userId,
          itemType: 'question',
          state: card.state,
          currentStepIndex: card.currentStepIndex,
          interval: card.interval,
          easeFactor: card.easeFactor,
          repetitionCount: card.repetitionCount,
          lapses: card.lapses,
          nextReviewDate: nowStr,
          createdAt: nowStr,
          updatedAt: nowStr,
        });
        
        await db.insert(schema.questionReviewable).values({
          reviewableId,
          questionId: qId,
        });
        
        addedCount++;
      }
      
      Alert.alert('Success', `Added ${addedCount} question(s) to reviewable items (SRS).`);
      setSelectedQuestionIds(new Set());
      setIsSelectMode(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add to SRS');
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <Text className="text-slate-400 dark:text-slate-500">Loading review questions...</Text>
      </ScreenContainer>);

  }

  return (
    <ScreenContainer className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Review Questions</Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => setIsSelectMode(!isSelectMode)} className="p-1">
              <ListChecksIcon size={20} color={isSelectMode ? "#0d9488" : "#64748b"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)} className="p-1">
              <FilterIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {isSelectMode && (
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <TouchableOpacity onPress={toggleSelectAll} className="flex-row items-center">
              {selectedQuestionIds.size === displayQuestions.length && displayQuestions.length > 0 ? (
                <CheckSquareIcon size={18} color="#0d9488" />
              ) : (
                <SquareIcon size={18} color="#64748b" />
              )}
              <Text className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                {selectedQuestionIds.size} selected
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleAddToSRS(Array.from(selectedQuestionIds))}
              disabled={selectedQuestionIds.size === 0}
              className={`flex-row items-center px-3 py-1.5 rounded-lg ${selectedQuestionIds.size > 0 ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <PlusIcon size={16} color={selectedQuestionIds.size > 0 ? "white" : "#94a3b8"} />
              <Text className={`ml-1 text-sm font-medium ${selectedQuestionIds.size > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                Add to SRS
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 p-4">
        {displayQuestions.length === 0 ?
        <View className="items-center justify-center py-12">
            <Text className="text-slate-400 dark:text-slate-500 text-lg">No questions to review</Text>
          </View> :

        Object.entries(
          displayQuestions.reduce((groups, question) => {
            const unit = question.studyUnitName || question.subjectName || 'General Practice';
            if (!groups[unit]) groups[unit] = [];
            groups[unit].push(question);
            return groups;
          }, {} as Record<string, typeof questions>)
        ).map(([unitName, unitQuestions]) =>
        <View key={unitName} className="mb-6">
              <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 px-1">{unitName}</Text>
              {unitQuestions.map((question) => {
            const choices = questionChoices.get(question.id) || [];
            const selectedChoiceId = question.attempt?.choiceId;
            return (
              <View
                key={question.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm">
                
                    <View className="flex-row items-start mb-3">
                      {isSelectMode && (
                        <TouchableOpacity 
                          className="mr-3 mt-2" 
                          onPress={() => {
                            const newSet = new Set(selectedQuestionIds);
                            if (newSet.has(question.id)) {
                              newSet.delete(question.id);
                            } else {
                              newSet.add(question.id);
                            }
                            setSelectedQuestionIds(newSet);
                          }}
                        >
                          {selectedQuestionIds.has(question.id) ? (
                            <CheckSquareIcon size={20} color="#0d9488" />
                          ) : (
                            <SquareIcon size={20} color="#94a3b8" />
                          )}
                        </TouchableOpacity>
                      )}
                      <View className="mr-3 mt-0.5">
                        <View className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 items-center justify-center">
                          <BookOpenIcon size={18} color="#0d9488" />
                        </View>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1 flex-wrap">
                          <Text className="font-semibold text-teal-800 dark:text-teal-300 text-sm">
                            {question.subjectName || 'General'}
                          </Text>
                          {question.studyUnitName &&
                      <>
                              <Text className="text-slate-400 dark:text-slate-500 mx-2">•</Text>
                              <Text className="text-slate-500 dark:text-slate-400 text-xs" numberOfLines={1}>
                                {question.studyUnitName}
                              </Text>
                            </>
                      }
                        </View>

                        <Text className="text-slate-700 dark:text-slate-300 mb-3 font-medium" numberOfLines={3}>
                          {question.questionText || question.question_text || 'Question'}
                        </Text>

                        {/* Choices */}
                        {choices.length > 0 &&
                    <View className="space-y-2 mb-3">
                            {choices.map((choice) => {
                        const isSelected = choice.id === selectedChoiceId;
                        const isCorrect = choice.isCorrect === 1;

                        let bgClass = 'bg-slate-50 dark:bg-slate-700/50';
                        let borderClass = 'border-slate-200 dark:border-slate-600';
                        let textClass = 'text-slate-700 dark:text-slate-300';
                        let radioBorder = 'border-slate-300 dark:border-slate-500';
                        let radioBg = '';

                        if (isSelected && isCorrect) {
                          // User selected the correct answer
                          bgClass = 'bg-green-50 dark:bg-green-900/30';
                          borderClass = 'border-green-300 dark:border-green-700';
                          textClass = 'text-green-800 dark:text-green-300';
                          radioBorder = 'border-green-500 bg-green-500';
                          radioBg = 'bg-white';
                        } else if (isSelected) {
                          // User selected a wrong answer
                          bgClass = 'bg-red-50 dark:bg-red-900/30';
                          borderClass = 'border-red-300 dark:border-red-700';
                          textClass = 'text-red-800 dark:text-red-300';
                          radioBorder = 'border-red-500 bg-red-500';
                          radioBg = 'bg-white';
                        } else if (isCorrect) {
                          // Correct answer (not selected by user)
                          bgClass = 'bg-green-50 dark:bg-green-900/20';
                          borderClass = 'border-green-200 dark:border-green-800';
                          textClass = 'text-green-700 dark:text-green-400';
                          radioBorder = 'border-green-500';
                        }

                        return (
                          <View
                            key={choice.id}
                            className={`p-3 mb-2 rounded-lg border ${bgClass} ${borderClass}`}>
                            
                                  <View className="flex-row items-center">
                                    <View className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${radioBorder}`}>
                                      {radioBg && <View className={`w-2.5 h-2.5 rounded-full ${radioBg}`} />}
                                      {isCorrect && !isSelected && <CheckCircleIcon size={12} color="#22c55e" />}
                                    </View>
                                    <Text className={`flex-1 text-sm ${textClass}`}>
                                      {choice.choiceText}
                                    </Text>
                                    {isSelected && isCorrect &&
                              <Text className="text-xs text-green-600 dark:text-green-400 ml-2">Your choice</Text>
                              }
                                    {isSelected && !isCorrect &&
                              <Text className="text-xs text-red-600 dark:text-red-400 ml-2">Incorrect</Text>
                              }
                                    {isCorrect && !isSelected &&
                              <Text className="text-xs text-green-600 dark:text-green-400 ml-2">Correct</Text>
                              }
                                  </View>
                                </View>);

                      })}
                          </View>
                    }

                        <View className="flex-row items-center">
                          {question.reason === 'wrong' ?
                      <View className="flex-row items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                              <XCircleIcon size={14} color="#ef4444" />
                              <Text className="text-red-600 dark:text-red-400 text-xs ml-1">Incorrect</Text>
                            </View> :

                      <View className="flex-row items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                              <FlagIcon size={14} color="#f59e0b" />
                              <Text className="text-amber-600 dark:text-amber-400 text-xs ml-1">Flagged</Text>
                            </View>
                      }
                        </View>
                      </View>
                    </View>
                  </View>);

          })}
            </View>
        )
        }
      </ScrollView>

      <Modal
        visible={isFilterModalVisible}
        title="Filter Reviews"
        onClose={() => setFilterModalVisible(false)}
      >
        <ScrollView className="mb-4" showsVerticalScrollIndicator={false}>
          <Text className="font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-2">Status</Text>
          <View className="flex-row flex-wrap">
            <FilterPill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterPill label="Incorrect" active={filter === 'wrong'} onPress={() => setFilter('wrong')} />
            <FilterPill label="Flagged" active={filter === 'flagged'} onPress={() => setFilter('flagged')} />
          </View>

          <Text className="font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-4">Subject</Text>
          <View className="flex-row flex-wrap">
            {availableSubjects.map((subject) => (
              <FilterPill 
                key={subject} 
                label={subject} 
                active={selectedSubject === subject} 
                onPress={() => {
                  setSelectedSubject(subject);
                  setSelectedStudyUnit('All'); // Reset study unit when subject changes
                }} 
              />
            ))}
          </View>

          {selectedSubject !== 'All' && availableStudyUnits.length > 1 && (
            <>
              <Text className="font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-4">Study Unit</Text>
              <View className="flex-row flex-wrap">
                {availableStudyUnits.map((unit) => (
                  <FilterPill 
                    key={unit} 
                    label={unit} 
                    active={selectedStudyUnit === unit} 
                    onPress={() => setSelectedStudyUnit(unit)} 
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <TouchableOpacity
          className="bg-teal-600 p-4 rounded-xl items-center mt-2"
          onPress={() => setFilterModalVisible(false)}
        >
          <Text className="text-white font-semibold">Apply Filters</Text>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>);

}