import { Course } from './types';

type CourseLike = Pick<Course, 'course_name' | 'short_description' | 'difficulty' | 'attachment_url' | 'modules'>;

const compact = (value?: string | null) => value?.replace(/\s+/g, ' ').trim() || '';

export const getCourseSummary = (course: CourseLike) => {
  const provided = compact(course.short_description);
  if (provided) {
    return provided;
  }

  return `Tallman technical training focused on ${course.course_name.toLowerCase()}, with guided instruction, applied procedures, and scored checkpoints for workforce readiness.`;
};

export const getCourseBriefLabel = (course: CourseLike) => course.difficulty || 'Technical';

export const getCourseSupportText = (course: CourseLike) => {
  if (course.attachment_url) {
    return 'Includes attached training material for guided review.';
  }
  return 'Includes structured lessons, progress tracking, and completion scoring.';
};

export const getCourseUnitsLabel = (course: CourseLike) => {
  const unitCount = course.modules?.length;
  if (typeof unitCount === 'number' && unitCount > 0) {
    return `${unitCount} units`;
  }
  return 'Guided path';
};
