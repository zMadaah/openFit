// Tradução mínima no mesmo formato do openGym: a frase em inglês é a chave, {0}, {1}… são
// substituídos pelos argumentos. Só pt-BR: a interface deste app já é escrita em português, e
// este dicionário cobre as frases que vêm da lógica portada (progressão, plano, nomes de dias,
// partes do corpo, equipamentos e músculos).

const PT: Record<string, string> = {
  // contagens e genéricos
  '{0} exercise': '{0} exercício',
  '{0} exercises': '{0} exercícios',
  'Unknown exercise': 'Exercício desconhecido',
  'Rest': 'Descanso',
  'Routines': 'Rotinas',
  'Superset': 'Superset',
  'Shared routine': 'Rotina compartilhada',
  'No exercises yet.': 'Nenhum exercício ainda.',
  'No routines yet.': 'Nenhuma rotina ainda.',
  'Week schedule': 'Agenda da semana',
  'Weekly Training Plan': 'Plano de treino semanal',
  'Made with openGym': 'Feito com openGym',
  'this isn’t an openGym plan file': 'este não é um arquivo de plano do openGym',
  'New routine': 'Nova rotina',
  'Freestyle': 'Treino livre',

  // dias e meses
  Sunday: 'Domingo', Monday: 'Segunda', Tuesday: 'Terça', Wednesday: 'Quarta',
  Thursday: 'Quinta', Friday: 'Sexta', Saturday: 'Sábado',
  Su: 'D', Mo: 'S', Tu: 'T', We: 'Q', Th: 'Q', Fr: 'S', Sa: 'S',
  Jan: 'jan', Feb: 'fev', Mar: 'mar', Apr: 'abr', May: 'mai', Jun: 'jun',
  Jul: 'jul', Aug: 'ago', Sep: 'set', Oct: 'out', Nov: 'nov', Dec: 'dez',
  January: 'Janeiro', February: 'Fevereiro', March: 'Março', April: 'Abril', June: 'Junho',
  July: 'Julho', August: 'Agosto', September: 'Setembro', October: 'Outubro',
  November: 'Novembro', December: 'Dezembro',

  // progressão
  'No automatic progression': 'Sem progressão automática',
  'Linear progression': 'Progressão linear',
  'Greyskull LP': 'Greyskull LP',
  'Double progression': 'Progressão dupla',
  'Add time': 'Aumentar o tempo',
  'Targets stay where you set them.': 'As metas ficam onde você definiu.',
  'Hit every rep in every set and the weight goes up. Repeated misses trigger a deload.':
    'Fez todas as repetições em todas as séries, a carga sobe. Falhas repetidas geram uma descarga.',
  'Two straight sets plus a final set taken to failure. Beat the target on that set and the weight goes up — double if you double the reps. One failure resets 10 %.':
    'Duas séries fixas e uma última até a falha. Passou da meta nela, a carga sobe; dobrou as repetições, sobe em dobro. Uma falha volta 10%.',
  'Work up through a rep range at the same weight. Reach the top of the range in every set and the weight goes up, reps back to the bottom.':
    'Suba dentro de uma faixa de repetições com a mesma carga. Chegou ao topo da faixa em todas as séries, a carga sobe e as repetições voltam ao início.',
  'Hold every set for the full duration and the target goes up.':
    'Segurou todas as séries pelo tempo inteiro, a meta de tempo sobe.',
  'Nothing logged yet — this session sets the baseline.': 'Nada registrado ainda: este treino define a base.',
  'Held every set for the full time — target up by {0}s.': 'Segurou o tempo todo em todas as séries: meta +{0}s.',
  'Short {0} sessions in a row — back off to {1}s and build up again.': 'Ficou abaixo {0} treinos seguidos: volte para {1}s e suba de novo.',
  'Last time came up short — same target again.': 'Da última vez ficou abaixo: mesma meta de novo.',
  'Bodyweight — every rep last time, so go for {0} this time.': 'Peso corporal: fez todas da última vez, agora busque {0}.',
  'Bodyweight — same target again until every set is clean.': 'Peso corporal: mesma meta até completar todas as séries.',
  'Top of the rep range in every set — {0} {1} more, back to {2} reps.': 'Topo da faixa em todas as séries: +{0} {1}, voltando para {2} repetições.',
  'Stalled {0} sessions — deload to {1} {2}.': 'Estagnou {0} treinos: descarga para {1} {2}.',
  'Same weight — aim for {0} reps this time.': 'Mesma carga: busque {0} repetições hoje.',
  'Last set hit {0} reps — twice the target, so take a double jump of {1} {2}.': 'A última série chegou a {0} repetições, o dobro da meta: salto duplo de {1} {2}.',
  'Every rep last time — {0} {1} more.': 'Fez todas da última vez: +{0} {1}.',
  'Missed reps {0} sessions running — reset to {1} {2} and work back up.': 'Faltaram repetições {0} treinos seguidos: volte para {1} {2} e suba de novo.',
  'Missed reps — reset to {0} {1} and work back up.': 'Faltaram repetições: volte para {0} {1} e suba de novo.',
  'Missed reps last time — same weight again ({0} of {1} to go).': 'Faltaram repetições da última vez: mesma carga ({0} de {1} tentativas).',

  // partes do corpo
  back: 'costas', cardio: 'cardio', chest: 'peito', 'full body': 'corpo inteiro', 'lower arms': 'antebraços',
  'lower legs': 'panturrilhas', neck: 'pescoço', shoulders: 'ombros', 'upper arms': 'braços',
  'upper legs': 'pernas', waist: 'abdômen', hips: 'quadril',

  // equipamentos
  assisted: 'assistido', band: 'faixa elástica', barbell: 'barra', 'body weight': 'peso corporal',
  'bosu ball': 'bosu', cable: 'cabo / polia', dumbbell: 'halter', 'elliptical machine': 'elíptico',
  'ez barbell': 'barra W', hammer: 'marreta', kettlebell: 'kettlebell', landmine: 'landmine',
  'leverage machine': 'máquina', macebell: 'macebell', 'massage ball': 'bola de massagem',
  'medicine ball': 'medicine ball', 'olympic barbell': 'barra olímpica', 'resistance band': 'elástico',
  roller: 'rolo', rope: 'corda', sandbag: 'saco de areia', 'skierg machine': 'SkiErg',
  'sled machine': 'trenó', 'smith machine': 'smith', 'stability ball': 'bola suíça',
  'stationary bike': 'bicicleta', 'stepmill machine': 'escada', 'suspension trainer': 'suspensão (TRX)',
  tire: 'pneu', 'trap bar': 'trap bar', 'upper body ergometer': 'ergômetro de braço',
  'weight plate': 'anilha', weighted: 'com carga', 'wheel roller': 'roda abdominal', custom: 'personalizado',

  // músculos alvo do catálogo
  abductors: 'abdutores', abs: 'abdominais', adductors: 'adutores', biceps: 'bíceps', calves: 'panturrilhas',
  'cardiovascular system': 'cardiovascular', delts: 'deltoides', forearms: 'antebraços', glutes: 'glúteos',
  hamstrings: 'posteriores', lats: 'dorsais', 'levator scapulae': 'levantador da escápula', pectorals: 'peitorais',
  quads: 'quadríceps', 'serratus anterior': 'serrátil', spine: 'lombar', traps: 'trapézio', triceps: 'tríceps',
  'upper back': 'parte alta das costas', core: 'core', 'hip flexors': 'flexores do quadril', 'lower back': 'lombar',
  obliques: 'oblíquos', quadriceps: 'quadríceps',

  // nomes do mapa muscular (MUSCLE_NAME)
  Traps: 'Trapézio', Shoulders: 'Ombros', Chest: 'Peito', 'Upper back': 'Costas (alta)', Serratus: 'Serrátil',
  Biceps: 'Bíceps', Triceps: 'Tríceps', Forearms: 'Antebraços', Abs: 'Abdominais', Obliques: 'Oblíquos',
  'Lower back': 'Lombar', Glutes: 'Glúteos', Quads: 'Quadríceps', Hamstrings: 'Posteriores',
  Adductors: 'Adutores', 'Hip flexors': 'Flexores do quadril', Calves: 'Panturrilhas', Shins: 'Canelas',

  // plano inicial
  'Push Day': 'Empurrar (Push)', 'Pull Day': 'Puxar (Pull)', 'Leg Day': 'Pernas (Legs)',
}

export function t(s: string, ...args: (string | number)[]) {
  let v = PT[s] ?? s
  for (let i = 0; i < args.length; i++) v = v.split('{' + i + '}').join(String(args[i]))
  return v
}

export const getLang = () => 'pt'
