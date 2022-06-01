import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';
import { App } from './App';
import StyledEngineProvider from '@mui/material/StyledEngineProvider';
import "./index.css"

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DockerMuiThemeProvider>
        <CssBaseline />
        <StyledEngineProvider injectFirst>
          <App />
        </StyledEngineProvider>
      </DockerMuiThemeProvider>
    </React.StrictMode>,
  );
}
