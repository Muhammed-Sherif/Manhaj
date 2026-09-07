import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react-native';
import { getStudentProfile, patchStudentProfile, getStudentGradesWithTerms } from '@manhaj/api-client';
import { useAuthStore } from '../../store/authStore';
import type { GetStudentGradesWithTerms200Item } from '@manhaj/api-client';

interface GradeWithTerms {
    id?: string;
    name?: string;
    terms?: Array<{ id?: string; name?: string }>;
}

export default function SettingsScreen() {
    const { user, updateUser } = useAuthStore();
    const [grades, setGrades] = useState<GradeWithTerms[]>([]);
    const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [profile, gradeTree] = await Promise.all([
                    getStudentProfile(),
                    getStudentGradesWithTerms(),
                ]);
                await updateUser({ termId: profile.data.termId });
                setGrades(gradeTree.data);
                const selectedGrade = gradeTree.data.find((grade) =>
                    grade.terms.some((term) => term.id === profile.data.termId)
                );
                setExpandedGrade(selectedGrade?.id || null);
            } catch {
                Alert.alert('Unable to load terms', 'Connect to the internet and try again.');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [updateUser]);

    const selectTerm = async (termId: string) => {
        const network = await NetInfo.fetch();
        if (!network.isConnected) {
            Alert.alert('Internet required', 'Term selection needs an internet connection.');
            return;
        }

        setSaving(true);
        try {
            await patchStudentProfile({ termId });
            await updateUser({ termId });
        } catch {
            Alert.alert('Unable to save term', 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-slate-50 p-6">
            <Text className="text-2xl font-bold text-slate-800">Settings</Text>
            <Text className="mt-2 mb-6 text-slate-500">Choose your current term.</Text>

            {loading ? <Text className="text-slate-500">Loading terms...</Text> : null}
            {grades.map((grade) => {
                const expanded = expandedGrade === grade.id;
                return (
                    <View key={grade.id} className="mb-3 overflow-hidden rounded-xl bg-white shadow-sm">
                        <TouchableOpacity
                            className="flex-row items-center justify-between p-4"
                            onPress={() => setExpandedGrade(expanded ? null : grade.id)}
                        >
                            <Text className="text-lg font-semibold text-slate-800">{grade.name}</Text>
                            {expanded ? <ChevronDownIcon size={20} color="#64748b" /> : <ChevronRightIcon size={20} color="#64748b" />}
                        </TouchableOpacity>
                        {expanded ? grade.terms.map((term) => (
                            <TouchableOpacity
                                key={term.id}
                                className="flex-row items-center justify-between border-t border-slate-100 px-4 py-3"
                                disabled={saving}
                                onPress={() => void selectTerm(term.id)}
                            >
                                <Text className="text-slate-700">{term.name}</Text>
                                {user?.termId === term.id ? <CheckIcon size={18} color="#0d9488" /> : null}
                            </TouchableOpacity>
                        )) : null}
                    </View>
                );
            })}
        </ScrollView>
    );
}