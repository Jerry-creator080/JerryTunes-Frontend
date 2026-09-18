export const palette = {
  jerryRed: '#B71C1C', // Deep, sophisticated red accent
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  lightGray: '#E9ECEF',
  gray: '#ADB5BD',
  darkGray: '#495057',
  nearBlack: '#0A0A0A',
  black: '#000000',
  transparent: 'transparent',
};

export const colors = {
  light: {
    background: palette.offWhite,
    surface: palette.white,
    text: palette.black,
    textSecondary: palette.darkGray,
    primary: palette.jerryRed,
    border: palette.lightGray,
  },
  dark: {
    background: palette.black, // True black
    surface: palette.nearBlack,
    text: palette.white,
    textSecondary: palette.gray,
    primary: palette.jerryRed,
    border: '#1A1A1A',
  },
};
