import { Settings } from '@/components/Settings'
import { navigate, popPendingRoute } from '@/App'

export function SettingsView() {
  return (
    <Settings
      onSaved={() => {
        const pending = popPendingRoute()
        navigate(pending ?? '#/scan')
      }}
    />
  )
}
