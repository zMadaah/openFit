#!/usr/bin/env bash
# Cria (na primeira vez) uma conta com senha e gera um código de pareamento para o app.
# Uso: ./servidor/parear.sh [nome] [senha] [porta]
# O código vale 5 minutos; rode de novo para gerar outro.
set -euo pipefail

NOME="${1:-teste}"
SENHA="${2:-Treino-Local-2026}"
PORT="${3:-3000}"
B="http://localhost:$PORT"
DIR="$(cd "$(dirname "$0")" && pwd)"
CK="$DIR/dados/.cookie"
mkdir -p "$DIR/dados"

curl -sf "$B/api/health" >/dev/null || { echo "A API não respondeu em $B. Rode ./servidor/iniciar.sh primeiro."; exit 1; }

json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.$1??'')}catch{console.log('')}})"; }

# Entra; se a conta não existe, cria.
R="$(curl -s -c "$CK" -X POST "$B/api/login/password" -H 'Content-Type: application/json' -d "{\"name\":\"$NOME\",\"password\":\"$SENHA\"}")"
if [ -z "$(echo "$R" | json user)" ]; then
  R="$(curl -s -c "$CK" -X POST "$B/api/register/password" -H 'Content-Type: application/json' -d "{\"name\":\"$NOME\",\"password\":\"$SENHA\"}")"
  [ -n "$(echo "$R" | json user)" ] || { echo "Não consegui entrar nem criar a conta: $R"; exit 1; }
  echo "Conta criada: $NOME / $SENHA"
fi

CODE="$(curl -s -b "$CK" -X POST "$B/api/pair/create" -H 'Content-Type: application/json' -d "{\"current\":\"$SENHA\"}" | json code)"
[ -n "$CODE" ] || { echo "Não consegui gerar o código."; exit 1; }

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || true)"
echo
echo "No app: Ajustes > Conta e sincronização > Parear com o openGym"
echo "  Endereço: http://${IP:-SEU_IP}:$PORT"
echo "  Código:   $CODE   (vale 5 minutos)"
