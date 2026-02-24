#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  OwnStep — Автоматическая установка VPN на сервер
#  Просто запустите этот скрипт и следуйте инструкциям!
# ═══════════════════════════════════════════════════════════

set -e

PORT=443
XRAY_DIR="/opt/ownstep-xray"
CONFIG_FILE="$XRAY_DIR/config.json"
SERVICE_NAME="ownstep-xray"

# ─── Цвета для красивого вывода ───
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # Без цвета

clear
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                               ║${NC}"
echo -e "${PURPLE}║${BOLD}        ⬡  OwnStep — Установка VPN            ${NC}${PURPLE}║${NC}"
echo -e "${PURPLE}║                                               ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}  Этот скрипт автоматически:${NC}"
echo -e "  ✅ Скачает и установит Xray"
echo -e "  ✅ Сгенерирует ключи шифрования"
echo -e "  ✅ Создаст и запустит VPN-сервис"
echo -e "  ✅ Выдаст вам ссылку для подключения"
echo ""
echo -e "${YELLOW}  ⏱  Это займёт около 1 минуты...${NC}"
echo ""

# ─── Шаг 1: Проверка прав ───
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📋 Шаг 1 из 5: Проверка системы${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$EUID" -ne 0 ]; then
    echo ""
    echo -e "${RED}  ❌ Ошибка: скрипт нужно запускать от root!${NC}"
    echo ""
    echo -e "  Попробуйте так:"
    echo -e "  ${CYAN}sudo bash server-setup.sh${NC}"
    echo ""
    exit 1
fi

echo -e "  ✅ Права root — OK"
echo ""

# ─── Шаг 2: Скачивание Xray ───
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📥 Шаг 2 из 5: Скачивание Xray${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p "$XRAY_DIR"

echo -e "  ⏳ Ищу последнюю версию..."
LATEST=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep -oP '"tag_name": "\K[^"]+')
echo -e "  📌 Версия: ${GREEN}$LATEST${NC}"

ARCH=$(uname -m)
case $ARCH in
    x86_64) XRAY_ARCH="Xray-linux-64" ;;
    aarch64) XRAY_ARCH="Xray-linux-arm64-v8a" ;;
    *)
        echo -e "${RED}  ❌ Ошибка: неподдерживаемая архитектура: $ARCH${NC}"
        exit 1
    ;;
esac

DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/$LATEST/$XRAY_ARCH.zip"
echo -e "  ⏳ Скачиваю..."
cd /tmp
curl -sL -o xray.zip "$DOWNLOAD_URL"
unzip -qo xray.zip -d "$XRAY_DIR"
rm -f xray.zip
chmod +x "$XRAY_DIR/xray"

echo -e "  ✅ Xray установлен!"
echo ""

# ─── Шаг 3: Генерация ключей ───
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  🔐 Шаг 3 из 5: Генерация ключей шифрования${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

KEYS=$("$XRAY_DIR/xray" x25519)
PRIVATE_KEY=$(echo "$KEYS" | grep "Private" | awk '{print $3}')
PUBLIC_KEY=$(echo "$KEYS" | grep "Public" | awk '{print $3}')
UUID=$("$XRAY_DIR/xray" uuid)

echo -e "  ✅ Уникальные ключи сгенерированы!"
echo ""

# ─── Шаг 4: Создание конфигурации ───
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  ⚙️  Шаг 4 из 5: Настройка сервера${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > "$CONFIG_FILE" << XRAYEOF
{
    "log": {
        "loglevel": "warning"
    },
    "inbounds": [
        {
            "tag": "vless-reality-in",
            "port": $PORT,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "$UUID",
                        "flow": "xtls-rprx-vision"
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "show": false,
                    "dest": "www.google.com:443",
                    "xver": 0,
                    "serverNames": [
                        "www.google.com",
                        "google.com"
                    ],
                    "privateKey": "$PRIVATE_KEY",
                    "shortIds": [
                        "",
                        "abcd1234"
                    ]
                }
            },
            "sniffing": {
                "enabled": true,
                "destOverride": [
                    "http",
                    "tls",
                    "quic"
                ]
            }
        }
    ],
    "outbounds": [
        {
            "tag": "direct",
            "protocol": "freedom"
        },
        {
            "tag": "block",
            "protocol": "blackhole"
        }
    ],
    "routing": {
        "rules": [
            {
                "type": "field",
                "ip": [
                    "geoip:private"
                ],
                "outboundTag": "direct"
            }
        ]
    }
}
XRAYEOF

echo -e "  ✅ Конфигурация создана!"

# Создаём systemd сервис
cat > "/etc/systemd/system/$SERVICE_NAME.service" << SVCEOF
[Unit]
Description=OwnStep VPN Service
After=network.target

[Service]
Type=simple
ExecStart=$XRAY_DIR/xray run -c $CONFIG_FILE
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
SVCEOF

echo -e "  ✅ Сервис настроен!"
echo ""

# ─── Шаг 5: Запуск ───
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  🚀 Шаг 5 из 5: Запуск VPN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Открываем порт в файрволе
if command -v ufw &> /dev/null; then
    ufw allow $PORT/tcp 2>/dev/null || true
fi
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$PORT/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

echo -e "  ✅ Порт $PORT открыт"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" > /dev/null 2>&1
systemctl start "$SERVICE_NAME"
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "  ✅ VPN сервис запущен и работает!"
else
    echo ""
    echo -e "${RED}  ❌ Ошибка: сервис не запустился${NC}"
    echo -e "  Попробуйте посмотреть логи:"
    echo -e "  ${CYAN}journalctl -u $SERVICE_NAME -n 20${NC}"
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════
#  РЕЗУЛЬТАТ — ССЫЛКА ДЛЯ ПОДКЛЮЧЕНИЯ
# ═══════════════════════════════════════════════════════════

SERVER_IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')
VLESS_LINK="vless://$UUID@$SERVER_IP:$PORT?type=tcp&security=reality&sni=www.google.com&pbk=$PUBLIC_KEY&flow=xtls-rprx-vision&fp=chrome#OwnStep"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║${BOLD}   🎉  ГОТОВО! VPN успешно установлен!         ${NC}${GREEN}║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  📋 ВАША ССЫЛКА ДЛЯ ПОДКЛЮЧЕНИЯ:             ║${NC}"
echo -e "${PURPLE}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}$VLESS_LINK${NC}"
echo -e "${PURPLE}║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  ╔═══════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}  ║  📌 ЧТО ДЕЛАТЬ ДАЛЬШЕ:                    ║${NC}"
echo -e "${YELLOW}  ╠═══════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}  ║                                           ║${NC}"
echo -e "${YELLOW}  ║${NC}  1. Скопируйте ссылку выше (выделите      ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}     мышкой и нажмите Ctrl+C)               ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}  2. Откройте ${BOLD}setup.html${NC} на компьютере      ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}  3. Вставьте ссылку в поле                 ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}     «Вставить ссылку» и нажмите            ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}     «Сгенерировать конфиг»                 ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}  4. Запустите ${BOLD}OwnStep.bat${NC}                  ${YELLOW}║${NC}"
echo -e "${YELLOW}  ║${NC}                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}  ╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}📱 Для телефона:${NC} вставьте эту же ссылку в"
echo -e "     приложение v2rayNG (Android) или Streisand (iOS)"
echo ""
echo -e "  ${CYAN}🔧 Полезные команды:${NC}"
echo -e "     Статус:      ${GREEN}systemctl status $SERVICE_NAME${NC}"
echo -e "     Перезапуск:   ${GREEN}systemctl restart $SERVICE_NAME${NC}"
echo -e "     Логи:         ${GREEN}journalctl -u $SERVICE_NAME -f${NC}"
echo ""
