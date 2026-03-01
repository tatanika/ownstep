#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  OwnStepPro — Добавление Американского прокси на сервер
# ═══════════════════════════════════════════════════════════

set -e

PORT_US=444
XRAY_DIR="/opt/ownstep-xray"
CONFIG_FILE="$XRAY_DIR/config.json"
SERVICE_NAME="ownstep-xray"

# ─── Цвета ───
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                               ║${NC}"
echo -e "${PURPLE}║${BOLD}    ⬡  OwnStepPro — Американский прокси       ${NC}${PURPLE}║${NC}"
echo -e "${PURPLE}║                                               ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Ошибка: скрипт нужно запускать от root! (Используйте sudo)${NC}"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Ошибка: VPN (Xray) не найден! Сначала установите базовую версию.${NC}"
    exit 1
fi

echo -e "${CYAN}Введите данные вашего американского SOCKS5 прокси (например, от proxy6.net):${NC}"
echo ""

read -p "IP-адрес прокси: " US_IP
read -p "Порт прокси: " US_PORT
read -p "Логин: " US_LOGIN
read -s -p "Пароль: " US_PASS
echo ""
echo ""

if [ -z "$US_IP" ] || [ -z "$US_PORT" ]; then
    echo -e "${RED}❌ Ошибка: IP и Порт обязательны!${NC}"
    exit 1
fi

echo -e "⏳ Настраиваю ядро Xray..."

# Используем Python для безопасного редактирования JSON конфигурации
python3 -c "
import sys, json

config_file = sys.argv[1]
us_ip = sys.argv[2]
us_port = int(sys.argv[3])
us_login = sys.argv[4]
us_pass = sys.argv[5]

with open(config_file, 'r') as f:
    config = json.load(f)

# Проверяем, нет ли уже US прокси
has_us = any(out.get('tag') == 'proxy-us' for out in config.get('outbounds', []))
if has_us:
    print('US прокси уже настроен!')
    sys.exit(0)

# Берем первый inbound (должен быть немецкий)
inbound_de = config['inbounds'][0]

# Создаем копию для US
inbound_us = json.loads(json.dumps(inbound_de))
inbound_us['tag'] = 'vless-reality-in-us'
inbound_us['port'] = 444

config['inbounds'].append(inbound_us)

outbound_us = {
    'tag': 'proxy-us',
    'protocol': 'socks',
    'settings': {
        'servers': [{
            'address': us_ip,
            'port': us_port
        }]
    }
}

if us_login and us_pass:
    outbound_us['settings']['servers'][0]['users'] = [{
        'user': us_login,
        'pass': us_pass
    }]

config['outbounds'].append(outbound_us)

if 'routing' not in config:
    config['routing'] = {'rules': []}

config['routing']['rules'].insert(0, {
    'type': 'field',
    'inboundTag': ['vless-reality-in-us'],
    'outboundTag': 'proxy-us'
})

with open(config_file, 'w') as f:
    json.dump(config, f, indent=4)
" "$CONFIG_FILE" "$US_IP" "$US_PORT" "$US_LOGIN" "$US_PASS"

# Открываем новый порт в файрволе
if command -v ufw &> /dev/null; then
    ufw allow $PORT_US/tcp 2>/dev/null || true
fi
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$PORT_US/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

# Перезапускаем сервис
systemctl restart "$SERVICE_NAME"
sleep 2

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${RED}❌ Ошибка: сервис Xray не смог запуститься после обновления.${NC}"
    exit 1
fi

# ─── Извлекаем данные для ссылок ───
UUID=$(grep -oP '"id": "\K[^"]+' "$CONFIG_FILE" | head -n 1)
PRIVATE_KEY=$(grep -oP '"privateKey": "\K[^"]+' "$CONFIG_FILE" | head -n 1)

# Получаем публичный ключ через генерацию
if [ -n "$PRIVATE_KEY" ]; then
    PUBLIC_KEY=$("$XRAY_DIR/xray" x25519 -i "$PRIVATE_KEY" | grep "Public" | awk '{print $3}')
else
    PUBLIC_KEY=""
fi

SERVER_IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')

VLESS_LINK_DE="vless://$UUID@$SERVER_IP:443?type=tcp&security=reality&sni=www.google.com&pbk=$PUBLIC_KEY&flow=xtls-rprx-vision&fp=chrome#OwnStep_DE"
VLESS_LINK_US="vless://$UUID@$SERVER_IP:444?type=tcp&security=reality&sni=www.google.com&pbk=$PUBLIC_KEY&flow=xtls-rprx-vision&fp=chrome#OwnStep_US"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║${BOLD}   🎉  АМЕРИКАНСКИЙ ПРОКСИ ДОБАВЛЕН!           ${NC}${GREEN}║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  🇩🇪 ССЫЛКА ДЛЯ ОБЫЧНЫХ САЙТОВ (ГЕРМАНИЯ):    ║${NC}"
echo -e "${PURPLE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${CYAN}$VLESS_LINK_DE${NC}"
echo -e "${PURPLE}║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🇺🇸 ССЫЛКА ДЛЯ НЕЙРОСЕТЕЙ (США):             ║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}$VLESS_LINK_US${NC}"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  📌 Зайдите в setup.html и вставьте обе ссылки в соответствующие поля!${NC}"
echo ""
