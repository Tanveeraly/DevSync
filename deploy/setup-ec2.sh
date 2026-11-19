#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu 24.04 EC2 instance.
#   scp -i key.pem deploy/setup-ec2.sh ubuntu@<EC2_IP>:~
#   ssh -i key.pem ubuntu@<EC2_IP> 'bash setup-ec2.sh'
set -euo pipefail

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"

echo "==> Adding 2 GB swap (t3.micro only has 1 GB RAM)"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Capping Docker log size"
sudo mkdir -p /etc/docker
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json >/dev/null
sudo systemctl enable docker
sudo systemctl restart docker

mkdir -p ~/devsync
echo
echo "Done. Next:"
echo "  1. Create ~/devsync/.env (template: deploy/.env.production.example)"
echo "  2. Log out and back in so the 'docker' group applies"
