import { DrinkLogForm } from '@/components/DrinkLogForm'
import { addDrink, makeDrinkLog, type DrinkInput } from '@/store/drinks'
import { navigate } from '@/App'

/** Route #/log — the manual drink-logging form. */
export function DrinkLogView() {
  async function handleSubmit(input: DrinkInput): Promise<void> {
    const entry = makeDrinkLog(input)
    await addDrink(entry)
    navigate('#/drinks')
  }

  return (
    <DrinkLogForm
      onSubmit={input => void handleSubmit(input)}
      onCancel={() => navigate('#/drinks')}
    />
  )
}
