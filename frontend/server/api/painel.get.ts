import { obterMetricasPainel } from '@backend/services/codigos'
import { exigirLeituraCodigos } from '../utils/codigos'
import { getDatabase } from '../utils/database'

export default defineEventHandler(async (event) => {
  await exigirLeituraCodigos(event)
  return obterMetricasPainel(getDatabase(event))
})
