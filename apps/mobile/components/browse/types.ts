import type {
  StructuredGrade as ApiStructuredGrade,
  StructuredTerm as ApiStructuredTerm,
  StructuredModule as ApiStructuredModule,
  StructuredSubject as ApiStructuredSubject,
} from '@manhaj/api-client';

export type NavigationLevel = 'grades' | 'terms' | 'modules' | 'subjects' | 'studyUnits';

export type StructuredGrade = ApiStructuredGrade;
export type StructuredTerm = ApiStructuredTerm;
export type StructuredModule = ApiStructuredModule;
export type StructuredSubject = ApiStructuredSubject;
