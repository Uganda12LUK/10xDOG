export function ageFromBirthdate(birthdate: string | null): number | null {
  if (!birthdate) {
    return null;
  }

  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }

  if (age < 0) {
    return null;
  }
  return age;
}
