#!/bin/bash

echo "============================================"
echo "   HAN MOTORS VPS SECURITY CHECK SCRIPT"
echo "============================================"

# 1. Check for High CPU Usage (Potential Crypto Miners)
echo -e "\n[1] Checking for High CPU processes..."
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 6

# 2. Check for Unknown Docker Containers
echo -e "\n[2] Checking running Docker containers..."
docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"

# 3. Check Open Ports
echo -e "\n[3] Checking listening ports (Look for 27017 exposed to 0.0.0.0)..."
netstat -tulnp | grep LISTEN

# 4. Check SSH Authorized Keys (Backdoors)
echo -e "\n[4] Checking SSH Authorized Keys..."
if [ -f ~/.ssh/authorized_keys ]; then
    cat ~/.ssh/authorized_keys
else
    echo "No authorized_keys file found."
fi

# 5. Check Recent Login History
echo -e "\n[5] Recent logins..."
last -n 10

echo -e "\n============================================"
echo "DONE. Please review the output above."
echo "If you see processes like 'xmrig' or unknown docker containers, kill them immediately."
