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

export function ageStringFromBirthdate(birthdate: string | null): string | null {
  if (!birthdate) {
    return null;
  }

  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (now.getDate() < born.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return null;
  }

  if (years === 0) {
    return `${months} mies.`;
  }
  if (months === 0) {
    return `${years} l.`;
  }
  return `${years} l. ${months} mies.`;
}
