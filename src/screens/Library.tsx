// Exercícios: catálogo com busca e filtros. Portado de openGym/frontend/src/views/Library.jsx.
import { View } from 'react-native'
import { fmtNum } from '../core/format'
import { bestWeightFor } from '../core/history'
import { ExerciseBrowser, addToRoutineSheet, exerciseDetailSheet } from '../sheets/exercise'
import { useStore } from '../store/useStore'
import { Button, Header, Tag } from '../ui/kit'

export function Library() {
  const S = useStore(s => s.S)
  return (
    <View style={{ flex: 1 }}>
      <ExerciseBrowser
        header={<View style={{ marginHorizontal: -16 }}><Header title="Exercícios" sub="Catálogo do openGym em português" /></View>}
        onPick={ex => exerciseDetailSheet(ex)}
        rowRight={ex => {
          const best = bestWeightFor(S, ex.id)
          return (
            <>
              {best > 0 ? <Tag label={fmtNum(best)} accent /> : null}
              <Button size="sm" variant="tinted" icon="plus" title="Plano" onPress={() => addToRoutineSheet(ex)} />
            </>
          )
        }}
      />
    </View>
  )
}
