export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: UserRole;
  phone?: string;
  profilePhotoUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  isEmailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  instructorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  scheduledAt: string;
  materials: Material[];
  recordingUrl?: string;
  homework?: Homework;
}

export interface Material {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Homework {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  deadline: string;
  submissions: HomeworkSubmission[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  submittedAt: string;
  url: string;
  grade?: number;
  feedback?: string;
  isLate: boolean;
}

export interface Student {
  id: string;
  userId: string;
  courseId: string;
  instructorId: string;
  enrolledAt: string;
  performance: Performance[];
}

export interface Performance {
  studentId: string;
  homeworkId: string;
  grade: number;
  submittedAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}
