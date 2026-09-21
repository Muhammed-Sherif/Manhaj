import React from 'react';
import { GradeListView } from './GradeListView';
import { TermListView } from './TermListView';
import { ModuleListView } from './ModuleListView';
import { SubjectListView } from './SubjectListView';
import { StudyUnitListView } from './StudyUnitListView';
import { useBrowseStore } from '../../store/browseStore';

export const BrowseContent: React.FC = () => {
  const currentLevel = useBrowseStore((state) => state.currentLevel);

  switch (currentLevel) {
    case 'grades':
      return <GradeListView />;
    case 'terms':
      return <TermListView />;
    case 'modules':
      return <ModuleListView />;
    case 'subjects':
      return <SubjectListView />;
    case 'studyUnits':
      return <StudyUnitListView />;
    default:
      return null;
  }
};
