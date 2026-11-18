import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { screens } from './app/screens'
import { TerminalsProvider } from './data/terminals'
import { I18nProvider } from './i18n/i18n'
import './ui/fonts'
import './ui/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <TerminalsProvider>
        <App screens={screens} />
      </TerminalsProvider>
    </I18nProvider>
  </StrictMode>,
)
