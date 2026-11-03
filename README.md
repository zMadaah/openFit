# openGym RN

Port em **React Native + Expo (SDK 58)** do [openGym](https://github.com/alexpcosta/opengym), para rodar no iPhone pelo **Expo Go**, sem Xcode, sem conta e sem servidor.

Segue a **versão mobile do próprio openGym** (`VITE_MOBILE=1`): tudo fica no aparelho e o backup sai pela folha de compartilhamento. O estado usa o mesmo formato `S` do app web, então um backup JSON exportado no openGym web importa aqui, e vice-versa.

## Rodar no iPhone

No Mac: **Node 20.19+ ou 22**. No iPhone: o app **Expo Go** (App Store). Os dois na mesma rede Wi-Fi.

```sh
cd opengym-rn
npm install
npx expo start
```

Leia o QR code com a câmera do iPhone e abra no Expo Go. Se a rede bloquear a conexão direta: `npx expo start --tunnel`.

Se o Expo Go acusar versão de SDK incompatível, rode `npx expo install expo@latest --fix`.

Para ver os gráficos sem treinar 12 semanas: **Início > engrenagem > Carregar dados de exemplo** (o mesmo perfil da demo do openGym).

## O que foi portado

| openGym (web) | Aqui |
|---|---|
| Início: semana, treino de hoje, peso corporal com meta, sequência de semanas, calendário | igual |
| Plano: agenda semanal, rotinas, ícones, troca de treino num dia específico | igual |
| Editor de rotina: superset, reordenar, progressão por rotina, mapa do que o treino trabalha | igual |
| Treino: check-in de peso, prescrição automática com o motivo, séries por repetição, por tempo (com cronômetro) e cardio, RIR/RPE, superset, confirmação da carga de trabalho, PRs e resumo final com mapa muscular | igual |
| Progressão: linear, Greyskull LP, dupla, por tempo, com descarga | mesma lógica (`src/core/progression.js`) |
| Estatísticas: mapa de atividade de 12 meses, equilíbrio muscular (todas/difíceis), esforço, peso, progresso por exercício (melhor série, 1RM, esforço), histórico | igual |
| Exercícios: busca, filtros por parte do corpo e equipamento, exercício próprio, detalhe com calculadora de 1RM | igual, com nomes e instruções em português |
| Compartilhar plano (arquivo), imprimir plano (PDF) | arquivo pela folha de compartilhamento, PDF via `expo-print` |
| Importar de FitNotes, Strong, Hevy e peso do Apple Health | igual, pelo seletor de arquivos |
| Backup JSON, plano inicial PPL, apagar tudo | igual |
| Lembrete em dia de treino | notificação local semanal (`expo-notifications`) |
| Push "descanso acabou" pelo servidor | notificação local agendada no aparelho |
| Tela ligada durante o treino | `expo-keep-awake` |

### O que ficou de fora, e por quê

- **Login por passkey e sincronização com o servidor** (`/api/register`, `/api/login`, `/api/data`): passkeys nativas exigem um build próprio com *associated domains*, o que o Expo Go não permite. A versão mobile oficial do openGym também não fala com o servidor.
- **Coach com IA** (`/api/coach/*`): depende do backend e das credenciais do provedor configuradas pelo administrador.
- **Painel de administração e convites**: são do servidor.
- **Animações da Gym visual**: o openGym (e o dataset de onde o repositório inicial puxa os GIFs) usa mídia da Gym visual, licenciada só para aqueles projetos. Veja "Demonstração dos exercícios" abaixo.
- **Idiomas**: só português do Brasil.

## Demonstração dos exercícios

Cada exercício mostra, nesta ordem de preferência:

1. **Vídeo licenciado**, se `EXPO_PUBLIC_EXERCISE_VIDEO_BASE` estiver definido (num `.env`). O app toca `{base}/{id}.mp4` em loop, com os mesmos ids do openGym. É aqui que entram as animações da Gym visual depois que você tiver licença própria em gymvisual.com (por exemplo, hospedadas num bucket S3).
2. **Fotos de posição inicial e final** do [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (marcado como domínio público), alternadas para mostrar o movimento. Cobrem cerca de 270 exercícios, incluindo todo o plano inicial. O cruzamento é conservador: na dúvida, o exercício fica sem foto.
3. **Sempre**, um atalho "Ver vídeo de execução no YouTube".

Para regenerar o cruzamento das fotos: `node scripts/build-media.mjs /caminho/free-exercise-db/dist/exercises.json`.

## Estrutura

```
App.tsx                 abas, pilha por aba, cronômetro, folhas
src/core/               lógica portada do openGym (history, progression, effort, onerm,
                        muscles, plan-share, import-csv, starter, demoSeed, body-paths)
                        + exercises.ts, format.ts, i18n.ts (pt-BR) e native.ts (Expo)
src/store/              useStore (estado S, AsyncStorage) e useUI (folhas, avisos, cronômetros)
src/sheets/             fluxos do sheets.jsx (exercício, plano, treino, peso)
src/screens/            Início, Plano, Treino, Estatísticas, Exercícios, Ajustes
src/ui/                 componentes base, ícones, gráficos (react-native-svg)
src/data/exercises.json catálogo gerado (5.600 exercícios, mesmos ids do openGym)
tests/                  testes originais do openGym + testes do port
```

## Testes

```sh
npm test
```

Roda os 147 testes de lógica do openGym (histórico, progressão, esforço, 1RM, dados de exemplo) contra o código portado, mais testes de importação, compartilhamento de plano e busca. Três expectativas foram ajustadas para a vírgula decimal do pt-BR.

## Catálogo

Para regenerar o catálogo a partir de uma cópia do openGym que tenha `catalogue/i18n/pt-BR.json`:

```sh
node scripts/build-catalogue.mjs ~/caminho/para/openGym
```

## Licença

AGPL-3.0-or-later, como o openGym. Catálogo de exercícios do openGym (parte sob MIT, do [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)). Desenho do mapa muscular do MuscleMap, de Melih Colpan (MIT).
