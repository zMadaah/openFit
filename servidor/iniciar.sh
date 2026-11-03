#!/usr/bin/env bash
# Sobe a API do openGym no seu computador para testar a sincronização no celular físico.
# Uso: ./servidor/iniciar.sh ~/Documents/openGym [porta]
# Requer Node 20+ e a versão do openGym com pareamento (DuarteSantos8/openGym atual).
set -euo pipefail

OPENGYM="${1:-}"
PORT="${2:-3000}"
if [ -z "$OPENGYM" ] || [ ! -f "$OPENGYM/api/server.js" ]; then
  echo "uso: $0 <pasta do openGym> [porta]   (ex.: $0 ~/Documents/openGym)"; exit 1
fi
if ! grep -q "pair/redeem" "$OPENGYM/api/server.js"; then
  echo "Esta versão do openGym não tem pareamento (/api/pair/redeem). Use o DuarteSantos8/openGym atual."; exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
DATA="$DIR/dados"
mkdir -p "$DATA"

# IP do computador na rede Wi-Fi (macOS: en0/en1; Linux: hostname -I)
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || true)"

cd "$OPENGYM/api"
[ -d node_modules ] || { echo "Instalando dependências da API..."; npm ci --omit=optional --no-audit --no-fund; }

echo
echo "API do openGym em http://localhost:$PORT"
[ -n "$IP" ] && echo "No celular (mesma rede Wi-Fi), use o endereço:  http://$IP:$PORT"
echo "Dados em: $DATA"
echo "Para gerar o código de pareamento, abra outro terminal e rode: ./servidor/parear.sh"
echo

# PASSWORD_LOGIN=1: conta com senha, sem precisar de passkey (que exige HTTPS fora do localhost).
exec env PORT="$PORT" DATA_DIR="$DATA" PASSWORD_LOGIN=1 \
  ORIGIN="http://localhost:$PORT" RP_ID=localhost node server.js
