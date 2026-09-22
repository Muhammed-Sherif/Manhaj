import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { and, eq, isNull } from 'drizzle-orm';
import { BookOpenIcon, PlayIcon } from 'lucide-react-native';
import { ScreenHeader, LoadingView } from '../components';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { useAuthStore } from '../store/authStore';
import {
  buildCustomStudyQueue,
  DEFAULT_STUDY_FILTERS,
  type CustomStudyFilters,
  type StudyContentType,
  type StudyDueScope,
} from '../services/customStudyService';

/**
 * Custom Study launcher — a setup screen in front of the ordinary review session.
 *
 * The filters compose with AND, so the summary count is the honest answer to "what will
 * I get". It is recomputed on every change against the local SQLite copy, which is cheap
 * and means the student never starts a session that turns out to be empty by surprise.
 */

const CONTENT_TYPE_LABELS: Record<StudyContentType, string> = {
  question: 'Questions',
  case: 'Cases',
  note: 'Notes',
  summary: 'Summaries',
};

const DUE_SCOPE_OPTIONS: { value: StudyDueScope; label: string; hint: string }[] = [
  { value: 'due', label: 'Due only', hint: 'Cards the scheduler says are ready today.' },
  {
    value: 'all',
    label: 'Everything',
    hint: 'Ignore due dates. Ratings still move the real schedule.',
  },
  {
    value: 'all_including_new',
    label: 'Everything + new',
    hint: 'Also include content you have never reviewed before.',
  },
];

const QUESTION_SOURCE_LABELS: Record<schema.QuestionSourceType, string> = {
  previous_exam: 'Previous exam',
  doctor_confirmation: 'Doctor confirmation',
  owner: 'Owner',
  team_expectation: 'Team expectation',
  data: 'Data',
};

type ScopeKind = 'all' | 'subject' | 'studyUnit';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-2 rounded-full border ${
        selected
          ? 'bg-teal-600 border-teal-600'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</Text>
      {!!hint && <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</Text>}
      <View className="flex-row flex-wrap gap-2 mt-3">{children}</View>
    </View>
  );
}

export default function CustomStudyScreen() {
  const router = useRouter();

  const [contentTypes, setContentTypes] = useState<StudyContentType[]>(
    DEFAULT_STUDY_FILTERS.contentTypes,
  );
  const [dueScope, setDueScope] = useState<StudyDueScope>(DEFAULT_STUDY_FILTERS.dueScope);
  const [questionSources, setQuestionSources] = useState<schema.QuestionSourceType[]>([]);
  const [scopeKind, setScopeKind] = useState<ScopeKind>('all');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [studyUnitId, setStudyUnitId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [studyUnits, setStudyUnits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueSize, setQueueSize] = useState<number | null>(null);

  const includesQuestions = contentTypes.includes('question');

  // Scope is only meaningful once it names something, so the filter falls back to
  // "everything" until the student has actually picked a subject or a studyUnit.
  const scope: CustomStudyFilters['scope'] = useMemo(() => {
    if (scopeKind === 'subject' && subjectId) return { kind: 'subject', subjectId };
    if (scopeKind === 'studyUnit' && studyUnitId) return { kind: 'studyUnit', studyUnitId };
    return { kind: 'all' };
  }, [scopeKind, subjectId, studyUnitId]);

  const filters = useMemo<CustomStudyFilters>(
    () => ({
      contentTypes,
      dueScope,
      // Source tags are a question-only axis; carrying them into a case/note session
      // would silently filter those types down to nothing.
      questionSources: includesQuestions ? questionSources : [],
      scope,
    }),
    [contentTypes, dueScope, questionSources, includesQuestions, scope],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const subjectRows = await db
          .select({ id: schema.subjects.id, name: schema.subjects.name })
          .from(schema.subjects);
        setSubjects(subjectRows.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load subjects for custom study:', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // The studyUnit list follows whichever subject is in focus. Selecting it explicitly in
  // subject mode would be a round trip, so the two modes share `subjectId`.
  useEffect(() => {
    if (!subjectId) {
      setStudyUnits([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const rows = await db
        .select({ id: schema.studyUnits.id, name: schema.studyUnits.name })
        .from(schema.studyUnits)
        .where(and(eq(schema.studyUnits.subjectId, subjectId), isNull(schema.studyUnits.deletedAt)));
      if (!cancelled) setStudyUnits(rows.sort((a, b) => a.name.localeCompare(b.name)));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  useEffect(() => {
    let cancelled = false;
    const count = async () => {
      try {
        const userId = useAuthStore.getState().user?.id ?? 'temp_user_id';
        const queue = await buildCustomStudyQueue(filters, userId);
        if (!cancelled) setQueueSize(queue.length);
      } catch (err) {
        console.error('Failed to size the custom study queue:', err);
        if (!cancelled) setQueueSize(null);
      }
    };
    void count();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const toggleContentType = (type: StudyContentType) => {
    setContentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const toggleQuestionSource = (source: schema.QuestionSourceType) => {
    setQuestionSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source],
    );
  };

  const selectScopeKind = (kind: ScopeKind) => {
    setScopeKind(kind);
    if (kind === 'all') {
      setSubjectId(null);
      setStudyUnitId(null);
    }
  };

  const start = () => {
    router.push({
      pathname: '/flashcards',
      params: { filters: JSON.stringify(filters) },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScreenHeader title="Custom Study" icon={<BookOpenIcon size={20} color="#0d9488" />} />
        <LoadingView />
      </View>
    );
  }

  const canStart = contentTypes.length > 0 && (queueSize ?? 0) > 0;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Custom Study"
        subtitle="Build a session from exactly what you want to review"
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4">
        <Section title="What to study" hint="Pick at least one. All filters combine, not stack.">
          {(Object.keys(CONTENT_TYPE_LABELS) as StudyContentType[]).map(type => (
            <Chip
              key={type}
              label={CONTENT_TYPE_LABELS[type]}
              selected={contentTypes.includes(type)}
              onPress={() => toggleContentType(type)}
            />
          ))}
        </Section>

        <Section title="Due status" hint={DUE_SCOPE_OPTIONS.find(o => o.value === dueScope)?.hint}>
          {DUE_SCOPE_OPTIONS.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              selected={dueScope === option.value}
              onPress={() => setDueScope(option.value)}
            />
          ))}
        </Section>

        {includesQuestions && (
          <Section
            title="Question sources"
            hint="Leave all unselected to include questions from every source."
          >
            {(Object.keys(QUESTION_SOURCE_LABELS) as schema.QuestionSourceType[]).map(source => (
              <Chip
                key={source}
                label={QUESTION_SOURCE_LABELS[source]}
                selected={questionSources.includes(source)}
                onPress={() => toggleQuestionSource(source)}
              />
            ))}
          </Section>
        )}

        <Section title="Where" hint="Applies to every content type you selected above.">
          <Chip
            label="All content"
            selected={scopeKind === 'all'}
            onPress={() => selectScopeKind('all')}
          />
          <Chip
            label="By subject"
            selected={scopeKind === 'subject'}
            onPress={() => selectScopeKind('subject')}
          />
          <Chip
            label="By studyUnit"
            selected={scopeKind === 'studyUnit'}
            onPress={() => selectScopeKind('studyUnit')}
          />

          {scopeKind !== 'all' && (
            <View className="w-full mt-3">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Subject
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {subjects.length === 0 ? (
                  <Text className="text-slate-400 text-sm">No subjects synced yet.</Text>
                ) : (
                  subjects.map(subject => (
                    <Chip
                      key={subject.id}
                      label={subject.name}
                      selected={subjectId === subject.id}
                      onPress={() => {
                        setSubjectId(subject.id);
                        setStudyUnitId(null);
                      }}
                    />
                  ))
                )}
              </View>
            </View>
          )}

          {scopeKind === 'studyUnit' && subjectId && (
            <View className="w-full mt-4">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                StudyUnit
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {studyUnits.length === 0 ? (
                  <Text className="text-slate-400 text-sm">No studyUnits in this subject yet.</Text>
                ) : (
                  studyUnits.map(studyUnit => (
                    <Chip
                      key={studyUnit.id}
                      label={studyUnit.name}
                      selected={studyUnitId === studyUnit.id}
                      onPress={() => setStudyUnitId(studyUnit.id)}
                    />
                  ))
                )}
              </View>
            </View>
          )}
        </Section>
      </ScrollView>

      <View className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <TouchableOpacity
          disabled={!canStart}
          onPress={start}
          className={`rounded-xl py-4 flex-row items-center justify-center ${
            canStart ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <PlayIcon size={18} color="#ffffff" />
          <Text className="text-white font-bold ml-2">
            {contentTypes.length === 0
              ? 'Pick a content type'
              : queueSize === null
                ? 'Start session'
                : queueSize === 0
                  ? 'No cards match'
                  : `Start with ${queueSize} card${queueSize === 1 ? '' : 's'}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
