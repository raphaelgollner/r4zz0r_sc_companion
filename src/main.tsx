import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { screens } from './app/screens'
import { TerminalsProvider } from './data/terminals'
import { I18nProvider } from './i18n/i18n'
import { FleetProvider } from './store/fleet'
import { loadPrefs } from './store/prefs'
import { OverlayProvider } from './store/overlay'
import { ProgressProvider } from './store/progress'
import { applyTheme } from './ui/themes'
import './ui/fonts'
import './ui/theme.css'

applyTheme(loadPrefs().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ProgressProvider>
        <OverlayProvider>
          <FleetProvider>
            <TerminalsProvider>
              <App screens={screens} />
            </TerminalsProvider>
          </FleetProvider>
        </OverlayProvider>
      </ProgressProvider>
    </I18nProvider>
  </StrictMode>,
)
