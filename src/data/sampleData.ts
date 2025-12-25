import { Student } from '../types';

export const generateStudents = (count: number = 50): Student[] => {
  const majors = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History'];
  const statuses = ['active', 'graduated', 'suspended'] as const;
  
  return Array.from({ length: count }, (_, index) => ({
    id: `STU${String(index + 1).padStart(3, '0')}`,
    name: `Student ${index + 1}`,
    age: Math.floor(Math.random() * 10) + 18,
    grade: Math.floor(Math.random() * 40) + 60,
    email: `student${index + 1}@university.edu`,
    phone: `+1 (555) ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    major: majors[Math.floor(Math.random() * majors.length)],
    enrollmentDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    graduationDate: `202${Math.floor(Math.random() * 4) + 4}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }));
};

export const initialData = generateStudents(50);