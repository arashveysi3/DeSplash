export function lekLabel(leks) {
  if (!leks || leks.length === 0) return 'Alle Lektionen';
  const nums = leks.map((l) => parseInt(String(l).replace(/\D/g, ''), 10)).filter((n) => !isNaN(n)).sort((a, b) => a - b);
  if (!nums.length) return leks.join(', ');
  if (nums.length === 1) return `Lektion ${nums[0]}`;
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (contiguous) return `Lektion ${nums[0]}–${nums[nums.length - 1]}`;
  if (nums.length > 4) return `${nums.length} Lektionen`;
  return nums.map((n) => `L${n}`).join(' · ');
}

export function greeting(name) {
  const h = new Date().getHours();
  const base = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  return name ? `${base}, ${name}` : base;
}
