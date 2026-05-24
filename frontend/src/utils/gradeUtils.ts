export const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'text-green-600 bg-green-50'
  if (grade >= 75) return 'text-blue-600 bg-blue-50'
  if (grade >= 60) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

export const getGradeLabel = (grade: number): string => {
  if (grade >= 90) return 'Отлично'
  if (grade >= 75) return 'Хорошо'
  if (grade >= 60) return 'Удовлетворительно'
  return 'Неудовлетворительно'
}

export const calculateAverage = (grades: number[]): number => {
  if (grades.length === 0) return 0
  const sum = grades.reduce((acc, grade) => acc + grade, 0)
  return Math.round(sum / grades.length)
}
