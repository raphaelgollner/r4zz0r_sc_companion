import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { screens } from './app/screens'
import { TerminalsProvider } from './data/terminals'
import { I18nProvider } from './i18n/i18n'
import { ProgressProvider } from './store/progress'
import './ui/fonts'
import './ui/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ProgressProvider>
        <TerminalsProvider>
          <App screens={screens} />
        </TerminalsProvider>
      </ProgressProvider>
    </I18nProvider>
  </StrictMode>,
)
