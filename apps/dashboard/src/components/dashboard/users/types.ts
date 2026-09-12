export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | string;
  image?: string | null;
  termId?: string | null;
  termName?: string | null;
  gradeId?: string | null;
  gradeName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'student';
  termId?: string | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'student';
  termId?: string | null;
}

export interface GradeOption {
  id: string;
  name: string;
}

export interface TermOption {
  id: string;
  name: string;
  gradeId?: string;
}

