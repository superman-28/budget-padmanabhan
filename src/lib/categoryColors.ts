// Modern, Dribbble-inspired category palette.
// Deterministic per category so colors stay stable across the app.
export const CATEGORY_PALETTE = [
  '#FF6B6B', // coral
  '#FF9F45', // tangerine
  '#FFC93C', // saffron
  '#4ECDC4', // teal
  '#2EC4B6', // aqua
  '#3DA5F4', // azure
  '#5B8DEF', // cornflower
  '#7C6BFF', // violet
  '#A66DD4', // orchid
  '#F368A0', // rose
  '#59C36A', // fresh green
  '#00B894', // emerald
  '#E17055', // clay
  '#8D9EFF', // periwinkle
  '#F7A072', // apricot
  '#4D96FF', // electric blue
];

const NAMED: Record<string, string> = {
  food: '#FF9F45',
  groceries: '#59C36A',
  transport: '#4D96FF',
  travel: '#2EC4B6',
  entertainment: '#A66DD4',
  shopping: '#F368A0',
  bills: '#00B894',
  utilities: '#4ECDC4',
  health: '#FF6B6B',
  rent: '#7C6BFF',
  education: '#5B8DEF',
  salary: '#00B894',
  investment: '#FFC93C',
  other: '#8D9EFF',
};

export const getCategoryColor = (value: string): string => {
  const key = (value || '').trim().toLowerCase();
  if (NAMED[key]) return NAMED[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
};
