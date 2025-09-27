#!/bin/bash

# PocketBase HTTPS Service Setup Script
# This script sets up PocketBase to run as a systemd service with HTTPS

set -e

echo "🚀 Setting up PocketBase HTTPS service..."

# Configuration
DOMAIN="p.ringing.org.uk"
PB_USER="pocketbase"
PB_HOME="/opt/pocketbase"
PB_DATA_DIR="/var/lib/pocketbase"
SERVICE_NAME="pocketbase"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Create pocketbase user
if ! id "$PB_USER" &>/dev/null; then
    print_status "Creating pocketbase user..."
    useradd --system --home-dir "$PB_HOME" --shell /bin/false "$PB_USER"
else
    print_status "PocketBase user already exists"
fi

# Create directories
print_status "Creating directories..."
mkdir -p "$PB_HOME"
mkdir -p "$PB_DATA_DIR"
mkdir -p "$PB_DATA_DIR/pb_data"
mkdir -p "$PB_DATA_DIR/pb_public"
mkdir -p "$PB_DATA_DIR/pb_hooks"
mkdir -p "$PB_DATA_DIR/pb_migrations"

# Download PocketBase if not exists
if [ ! -f "$PB_HOME/pocketbase" ]; then
    print_status "Downloading PocketBase..."
    cd "$PB_HOME"
    
    # Get latest version
    LATEST_VERSION=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    
    # Download for Linux AMD64
    wget "https://github.com/pocketbase/pocketbase/releases/download/${LATEST_VERSION}/pocketbase_${LATEST_VERSION#v}_linux_amd64.zip"
    unzip "pocketbase_${LATEST_VERSION#v}_linux_amd64.zip"
    rm "pocketbase_${LATEST_VERSION#v}_linux_amd64.zip"
    
    chmod +x pocketbase
    print_status "PocketBase downloaded and extracted"
else
    print_status "PocketBase binary already exists"
fi

# Set ownership
chown -R "$PB_USER:$PB_USER" "$PB_HOME"
chown -R "$PB_USER:$PB_USER" "$PB_DATA_DIR"

# Create systemd service file
print_status "Creating systemd service file..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=PocketBase HTTPS Server
Documentation=https://pocketbase.io/docs/
After=network.target
Wants=network.target

[Service]
Type=simple
User=$PB_USER
Group=$PB_USER
ExecStart=$PB_HOME/pocketbase serve $DOMAIN \\
    --dir=$PB_DATA_DIR/pb_data \\
    --publicDir=$PB_DATA_DIR/pb_public \\
    --hooksDir=$PB_DATA_DIR/pb_hooks \\
    --migrationsDir=$PB_DATA_DIR/pb_migrations \\
    --http=0.0.0.0:80 \\
    --https=0.0.0.0:443 \\
    --origins="*"

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=$PB_DATA_DIR

# Allow binding to privileged ports
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Restart policy
Restart=always
RestartSec=5
StartLimitInterval=60s
StartLimitBurst=3

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pocketbase

[Install]
WantedBy=multi-user.target
EOF

# Create environment file for additional configuration
print_status "Creating environment file..."
cat > "/etc/default/pocketbase" << EOF
# PocketBase Environment Configuration
# Uncomment and modify as needed

# Encryption key (32 characters)
# PB_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Additional CORS origins (comma-separated)
# PB_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database query timeout (seconds)
# PB_QUERY_TIMEOUT=30

# Hooks pool size
# PB_HOOKS_POOL=25
EOF

# Create log rotation configuration
print_status "Setting up log rotation..."
cat > "/etc/logrotate.d/pocketbase" << EOF
/var/log/pocketbase/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $PB_USER $PB_USER
    postrotate
        systemctl reload pocketbase
    endscript
}
EOF

# Create backup script
print_status "Creating backup script..."
cat > "$PB_HOME/backup.sh" << 'EOF'
#!/bin/bash

# PocketBase Backup Script
BACKUP_DIR="/var/backups/pocketbase"
DATE=$(date +%Y%m%d_%H%M%S)
PB_DATA="/var/lib/pocketbase/pb_data"

mkdir -p "$BACKUP_DIR"

# Create backup
tar -czf "$BACKUP_DIR/pocketbase_backup_$DATE.tar.gz" -C "$PB_DATA" .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "pocketbase_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: pocketbase_backup_$DATE.tar.gz"
EOF

chmod +x "$PB_HOME/backup.sh"
chown "$PB_USER:$PB_USER" "$PB_HOME/backup.sh"

# Create daily backup cron job
print_status "Setting up daily backups..."
cat > "/etc/cron.d/pocketbase-backup" << EOF
# Daily PocketBase backup at 2 AM
0 2 * * * $PB_USER $PB_HOME/backup.sh >> /var/log/pocketbase-backup.log 2>&1
EOF

# Reload systemd and enable service
print_status "Enabling and starting PocketBase service..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# Check if service is already running and stop it
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_warning "Stopping existing PocketBase service..."
    systemctl stop "$SERVICE_NAME"
fi

# Start the service
systemctl start "$SERVICE_NAME"

# Wait a moment and check status
sleep 3

if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "PocketBase service started successfully!"
    
    echo ""
    echo "🎉 PocketBase HTTPS setup complete!"
    echo ""
    echo "📋 Service Information:"
    echo "   • Service name: $SERVICE_NAME"
    echo "   • Domain: https://$DOMAIN"
    echo "   • HTTP redirect: http://$DOMAIN → https://$DOMAIN"
    echo "   • Data directory: $PB_DATA_DIR"
    echo "   • User: $PB_USER"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • Status: systemctl status $SERVICE_NAME"
    echo "   • Logs: journalctl -u $SERVICE_NAME -f"
    echo "   • Restart: systemctl restart $SERVICE_NAME"
    echo "   • Stop: systemctl stop $SERVICE_NAME"
    echo ""
    echo "💾 Backup:"
    echo "   • Manual backup: $PB_HOME/backup.sh"
    echo "   • Daily automatic backups at 2 AM"
    echo "   • Backups stored in: /var/backups/pocketbase/"
    echo ""
    echo "🌐 Access:"
    echo "   • Admin UI: https://$DOMAIN/_/"
    echo "   • API: https://$DOMAIN/api/"
    echo ""
    print_warning "Make sure your DNS points $DOMAIN to this server's IP address!"
    print_warning "PocketBase will automatically handle SSL certificate generation via Let's Encrypt"
    
else
    print_error "Failed to start PocketBase service!"
    echo "Check the logs with: journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi
EOF