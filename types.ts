export enum UserRole {
  ADMIN = 'Admin',
  INSTRUCTOR = 'Instructor',
  MANAGER = 'Manager',
  LEARNER = 'Learner',
  MENTOR = 'Mentor',
  HOLD = 'Hold'
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface User {
  user_id: string;
  display_name: string;
  email: string;
  password?: string;
  avatar_url: string;
  roles: UserRole[];
  points: number;
  level: number;
  branch_id?: string;
  department?: string;
  last_login?: string;
  status?: string;
}

export interface MentorshipLog {
  id: string;
  mentor_id: string;
  mentee_id: string;
  mentee_name: string;
  hours: number;
  date: string;
  notes?: string;
}

export interface Branch {
  branch_id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  domain: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  correct_index?: number; // Backend schema compatibility
}

export interface Lesson {
  lesson_id: string;
  module_id: string;
  lesson_title: string;
  lesson_type: 'video' | 'document' | 'quiz' | 'discussion';
  content?: string;
  quiz_questions?: QuizQuestion[];
  duration_minutes: number;
}

export interface Module {
  module_id: string;
  course_id: string;
  module_title: string;
  position: number;
  lessons: Lesson[];
}

export interface Course {
  course_id: string;
  course_name: string;
  short_description: string;
  thumbnail_url: string;
  category_id: string;
  instructor_id: string;
  status: CourseStatus;
  enrolled_count: number;
  rating: number;
  modules?: Module[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface Enrollment {
  enrollment_id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  status: 'active' | 'completed' | 'dropped';
  completed_lesson_ids?: string[];
  unit_attempts?: Record<string, number>; // Tracks number of quiz attempts per unit (module_id)
  enrolled_at: string;
}

export interface Badge {
  badge_id: string;
  badge_name: string;
  badge_image_url: string;
  criteria: string;
}

export interface Certificate {
  certificate_id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  completion_date: string;
  issuer: string;
}

export interface ForumPost {
  id: string;
  author_name: string;
  author_avatar: string;
  title: string;
  content: string;
  category: string;
  replies: number;
  is_pinned?: boolean;
  timestamp: string;
}