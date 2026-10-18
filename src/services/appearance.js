export const applyTheme = (themeMode) => {
  const root = document.documentElement;
  let isDark = false;

  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = false;
  }

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
  localStorage.setItem('theme', themeMode);
};

export const applyPrimaryColor = (color) => {
  const root = document.documentElement;
  const validColors = ['amber', 'indigo', 'emerald', 'rose', 'sky'];
  const colorName = validColors.includes(color) ? color : 'amber';

  root.setAttribute('data-accent', colorName);
  localStorage.setItem('primaryColor', colorName);
};

export const applyAppearance = (themeMode, color) => {
  applyTheme(themeMode || localStorage.getItem('theme') || 'light');
  applyPrimaryColor(color || localStorage.getItem('primaryColor') || 'amber');
};
