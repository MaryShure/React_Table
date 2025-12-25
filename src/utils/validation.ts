export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateAge = (age: number): boolean => {
  return age >= 16 && age <= 100;
};

export const validateGrade = (grade: number): boolean => {
  return grade >= 0 && grade <= 100;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const getValidationMessage = (field: string, value: any): string => {
  switch (field) {
    case 'email':
      if (!validateEmail(value)) return 'Please enter a valid email address';
      break;
    case 'age':
      if (!validateAge(Number(value))) return 'Age must be between 16 and 100';
      break;
    case 'grade':
      if (!validateGrade(Number(value))) return 'Grade must be between 0 and 100';
      break;
    case 'phone':
      if (!validatePhone(value)) return 'Please enter a valid phone number';
      break;
  }
  return '';
};