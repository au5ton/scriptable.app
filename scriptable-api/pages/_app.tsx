import CssBaseline from "@material-ui/core/CssBaseline";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import 'highlight.js/styles/monokai-sublime.css';

const theme = createMuiTheme({
  palette: {
    type: "light",
  },
  shape: {
    borderRadius: 4, // was 16, @material-ui default is 4
  },
})

function MyApp({ Component, pageProps }) {
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Component {...pageProps} />
  </ThemeProvider>
}

export default MyApp
