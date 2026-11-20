import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { screens } from './app/screens'
import { TerminalsProvider } from './data/terminals'
import { I18nProvider } from './i18n/i18n'
import { FleetProvider } from './store/fleet'
import { loadPrefs } from './store/prefs'
import { ProgressProvider } from './store/progress'
import { applyTheme } from './ui/themes'
import './ui/fonts'
import './ui/theme.css'

// Tema salvo antes do primeiro desenho, para não piscar o dourado.
applyTheme(loadPrefs().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ProgressProvider>
        <FleetProvider>
          <TerminalsProvider>
            <App screens={screens} />
          </TerminalsProvider>
        </FleetProvider>
      </ProgressProvider>
    </I18nProvider>
  </StrictMode>,
)
