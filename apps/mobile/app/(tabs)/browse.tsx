import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRightIcon, BookOpenIcon, FileTextIcon, VideoIcon } from 'lucide-react-native';
import { useGetContentSync } from '@manhaj/api-client';
import type { Grade, Term, Module, Subject, Lecture } from '@manhaj/api-client';

// Helper function to structure the flat API response into nested hierarchy
const structureContent = (data) => {
  if (!data) return [];

  const { grades = [], terms = [], modules = [], subjects = [], lectures = [] } = data;

  return grades.map((grade: Grade) => ({
    ...grade,
    terms: terms
      .filter((term: Term) => term.gradeId === grade.id)
      .map((term: Term) => ({
        ...term,
        modules: modules
          .filter((module: Module) => module.termId === term.id)
          .map((module: Module) => ({
            ...module,
            subjects: subjects
              .filter((subject: Subject) => subject.moduleId === module.id)
              .map((subject: Subject) => ({
                ...subject,
                lectures: lectures.filter((lecture: Lecture) => lecture.subjectId === subject.id),
              })),
          })),
      })),
  }));
};

type NavigationLevel = 'grades' | 'terms' | 'modules' | 'subjects' | 'lectures';

type StructuredGrade = Grade & {
  terms: (Term & {
    modules: (Module & {
      subjects: (Subject & {
        lectures: Lecture[];
      })[];
    })[];
  })[];
};

export default function BrowseScreen() {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('grades');
  const [selectedGrade, setSelectedGrade] = useState<StructuredGrade | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<StructuredGrade['terms'][0] | null>(null);
  const [selectedModule, setSelectedModule] = useState<StructuredGrade['terms'][0]['modules'][0] | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<StructuredGrade['terms'][0]['modules'][0]['subjects'][0] | null>(null);

  const { data: contentData, isLoading, error } = useGetContentSync({});
  const structuredGrades = structureContent(contentData?.data);

  const navigateBack = () => {
    switch (currentLevel) {
      case 'terms':
        setCurrentLevel('grades');
        setSelectedGrade(null);
        break;
      case 'modules':
        setCurrentLevel('terms');
        setSelectedTerm(null);
        break;
      case 'subjects':
        setCurrentLevel('modules');
        setSelectedModule(null);
        break;
      case 'lectures':
        setCurrentLevel('subjects');
        setSelectedSubject(null);
        break;
    }
  };

  const handleGradeSelect = (grade: StructuredGrade) => {
    setSelectedGrade(grade);
    setCurrentLevel('terms');
  };

  const handleTermSelect = (term: StructuredGrade['terms'][0]) => {
    setSelectedTerm(term);
    setCurrentLevel('modules');
  };

  const handleModuleSelect = (module: StructuredGrade['terms'][0]['modules'][0]) => {
    setSelectedModule(module);
    setCurrentLevel('subjects');
  };

  const handleSubjectSelect = (subject: StructuredGrade['terms'][0]['modules'][0]['subjects'][0]) => {
    setSelectedSubject(subject);
    setCurrentLevel('lectures');
  };

  const handleLectureSelect = (lecture: Lecture) => {
    router.push(`/lecture?id=${lecture.id}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="mt-4 text-slate-600">Loading content...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center p-4">
        <Text className="text-red-600 text-center mb-4">Failed to load content</Text>
        <Text className="text-slate-600 text-center">Please check your connection and try again</Text>
      </View>
    );
  }

  const renderContent = () => {
    switch (currentLevel) {
      case 'grades':
        return (
          <View>
            {structuredGrades.map((grade) => (
              <TouchableOpacity
                key={grade.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => handleGradeSelect(grade)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800 text-lg">{grade.name}</Text>
                    <Text className="text-slate-500 text-sm">{grade.description}</Text>
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'terms':
        return (
          <View>
            {selectedGrade?.terms.map((term: any) => (
              <TouchableOpacity
                key={term.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => handleTermSelect(term)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800 text-lg">{term.name}</Text>
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'modules':
        return (
          <View>
            {selectedTerm?.modules.map((module: any) => (
              <TouchableOpacity
                key={module.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => handleModuleSelect(module)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800 text-lg">{module.name}</Text>
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'subjects':
        return (
          <View>
            {selectedModule?.subjects.map((subject: any) => (
              <TouchableOpacity
                key={subject.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => handleSubjectSelect(subject)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800 text-lg">{subject.name}</Text>
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'lectures':
        return (
          <View>
            {selectedSubject?.lectures.map((lecture: any) => (
              <TouchableOpacity
                key={lecture.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => handleLectureSelect(lecture)}
              >
                <View className="flex-row items-start">
                  <View className="bg-teal-100 rounded-lg p-2 mr-3">
                    <BookOpenIcon size={20} color="#0d9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800">{lecture.name}</Text>
                    <Text className="text-slate-500 text-sm mt-1">{lecture.description}</Text>

                    <View className="flex-row items-center mt-2 space-x-3">
                      <View className="flex-row items-center">
                        <VideoIcon size={14} color="#64748b" />
                        <Text className="text-slate-500 text-xs ml-1">2 videos</Text>
                      </View>
                      <View className="flex-row items-center">
                        <FileTextIcon size={14} color="#64748b" />
                        <Text className="text-slate-500 text-xs ml-1">5 files</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  };

  const getBreadcrumb = () => {
    const parts = [];
    if (selectedGrade) parts.push(selectedGrade.name);
    if (selectedTerm) parts.push(selectedTerm.name);
    if (selectedModule) parts.push(selectedModule.name);
    if (selectedSubject) parts.push(selectedSubject.name);
    return parts.join(' > ');
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white border-b border-slate-200 px-4 py-3">
        <View className="flex-row items-center">
          {currentLevel !== 'grades' && (
            <TouchableOpacity onPress={navigateBack} className="mr-3">
              <ChevronRightIcon size={24} color="#0d9488" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          )}
          <Text className="text-lg font-semibold text-slate-800 flex-1">
            {currentLevel === 'grades' ? 'Browse Content' : getBreadcrumb()}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {renderContent()}
      </ScrollView>
    </View>
  );
}
