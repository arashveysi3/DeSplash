import { createTheme, lightThemePrimitives } from 'baseui';

const primitives = {
  ...lightThemePrimitives,
  primary: '#000000',
  primary50: '#f2f2f2',
  primary100: '#e5e5e5',
  primary200: '#cccccc',
  primary300: '#999999',
  primary400: '#666666',
  primary500: '#000000',
  primary600: '#000000',
  primary700: '#000000',
};

export const theme = createTheme(primitives, {
  name: 'germansplash',
  typography: {
    font100: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font200: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font300: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font350: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font400: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font450: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    font550: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
    LabelMedium: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  },
  colors: {
    backgroundPrimary: '#ffffff',
    backgroundSecondary: '#f7f7f7',
    backgroundTertiary: '#efefef',
    contentPrimary: '#000000',
    contentSecondary: '#6b6b6b',
    borderOpaque: '#e5e5e5',
    borderSelected: '#000000',
    buttonPrimaryFill: '#000000',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryFill: '#ffffff',
    buttonSecondaryText: '#000000',
  },
  borders: {
    buttonBorderRadius: '12px',
  },
  animation: {
    timing100: '200ms',
  },
});

export const genderColor = (article) => {
  if (article === 'der') return '#2563eb'; // blue
  if (article === 'die') return '#dc2626'; // red
  if (article === 'das') return '#16a34a'; // green
  return '#000000';
};
export const genderBg = (article) => {
  if (article === 'der') return '#eff6ff';
  if (article === 'die') return '#fef2f2';
  if (article === 'das') return '#f0fdf4';
  return '#f9f9f9';
};
