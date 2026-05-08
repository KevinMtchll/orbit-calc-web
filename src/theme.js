import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff',
    },
    background: {
      default: '#3c3c3c'
    }
  },
  typography: {
    fontFamily: [
      'sans-serif',
    ].join(','),
  },
});

export default theme;