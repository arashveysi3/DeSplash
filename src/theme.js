import { createTheme, lightThemePrimitives } from 'baseui';

const primitives = {
  ...lightThemePrimitives,
  primary: '#0f0f12',
  primary50: '#f6f5ff',
  primary100: '#ecebff',
  primary200: '#ddd8ff',
  primary300: '#b8b0ff',
  primary400: '#8a7dff',
  primary500: '#0f0f12',
  primary600: '#0a0a0c',
  primary700: '#000000',
};

export const theme = createTheme(primitives, {
  name: 'germansplash-neo',
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
    backgroundSecondary: '#f7f7fb',
    backgroundTertiary: '#efeff6',
    contentPrimary: '#0f0f12',
    contentSecondary: '#6b6b7a',
    borderOpaque: '#e9e8f0',
    borderSelected: '#0f0f12',
    buttonPrimaryFill: '#0f0f12',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryFill: '#ffffff',
    buttonSecondaryText: '#0f0f12',
  },
  borders: {
    buttonBorderRadius: '14px',
  },
  animation: {
    timing100: '200ms',
  },
});

export const genderColor = (article) => {
  if (article === 'der') return '#2563eb';
  if (article === 'die') return '#dc2626';
  if (article === 'das') return '#16a34a';
  return '#0f0f12';
};
export const genderBg = (article) => {
  if (article === 'der') return '#eef3ff';
  if (article === 'die') return '#fff0f0';
  if (article === 'das') return '#eefaf0';
  return '#f9f9fb';
};
