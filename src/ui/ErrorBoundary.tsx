import { Component, type ReactNode } from 'react'
import { useI18n } from '../i18n/i18n'

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="load-error" role="alert">
      <span>{t('load.error')}</span>
      <button className="btn" onClick={onRetry}>
        {t('load.retry')}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Erro na tela:', error)
  }

  render() {
    if (this.state.failed) return <Fallback onRetry={() => this.setState({ failed: false })} />
    return this.props.children
  }
}
