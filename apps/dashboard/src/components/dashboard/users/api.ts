import { axios } from '@/api/client';
import type { UserRecord, CreateUserPayload, UpdateUserPayload, TermOption, GradeOption } from './types';

export async function fetchUsersApi(): Promise<UserRecord[]> {
  const res = await axios.get<UserRecord[]>('/admin/users');
  return res.data;
}

export async function createUserApi(payload: CreateUserPayload): Promise<UserRecord> {
  const res = await axios.post<UserRecord>('/admin/users', payload);
  return res.data;
}

export async function updateUserApi(id: string, payload: UpdateUserPayload): Promise<UserRecord> {
  const res = await axios.patch<UserRecord>(`/admin/users/${id}`, payload);
  return res.data;
}

export async function deleteUserApi(id: string): Promise<{ success: boolean; id: string }> {
  const res = await axios.delete<{ success: boolean; id: string }>(`/admin/users/${id}`);
  return res.data;
}

export async function fetchGradesApi(): Promise<GradeOption[]> {
  try {
    const res = await axios.get<GradeOption[]>('/admin/grades');
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchTermsApi(): Promise<TermOption[]> {
  try {
    const res = await axios.get<TermOption[]>('/admin/terms');
    return res.data;
  } catch {
    return [];
  }
}

