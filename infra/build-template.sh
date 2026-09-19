#!/usr/bin/env bash
set -euo pipefail
LAB=/var/lib/kubequest/lab
cd "$LAB"
test ! -e template.qcow2 || { echo 'Template already exists'; exit 0; }
curl -fsSL https://cloud-images.ubuntu.com/noble/current/SHA256SUMS -o ubuntu-SHA256SUMS
test -f ubuntu-base.img || curl -fL --retry 3 https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img -o ubuntu-base.img
expected=$(awk '/noble-server-cloudimg-amd64.img$/{print $1}' ubuntu-SHA256SUMS)
echo "$expected  ubuntu-base.img" | sha256sum -c -
qemu-img create -f qcow2 -F qcow2 -b "$LAB/ubuntu-base.img" building.qcow2 32G
KEY=$(cat id_ed25519.pub)
cat > user-data <<EOF
#cloud-config
hostname: kubequest-lab
ssh_pwauth: false
disable_root: false
users:
  - name: root
    ssh_authorized_keys:
      - $KEY
  - name: student
    shell: /bin/bash
    lock_passwd: true
    ssh_authorized_keys:
      - $KEY
write_files:
  - path: /etc/ssh/sshd_config.d/99-kubequest.conf
    content: |
      PasswordAuthentication no
      PermitRootLogin prohibit-password
      AllowTcpForwarding no
      X11Forwarding no
      PermitTunnel no
runcmd:
  - systemctl disable --now apt-daily.timer apt-daily-upgrade.timer
EOF
printf 'instance-id: kubequest-template-v1\nlocal-hostname: kubequest-lab\n' > meta-data
cloud-localds seed.img user-data meta-data
qemu-system-x86_64 -enable-kvm -cpu host -smp 4 -m 8192 -drive file=building.qcow2,if=virtio,format=qcow2 -drive file=seed.img,if=virtio,format=raw,readonly=on -netdev user,id=n1,hostfwd=tcp:127.0.0.1:22240-:22 -device virtio-net-pci,netdev=n1 -display none -serial file:build-serial.log -daemonize -pidfile build.pid
SSH=(ssh -i "$LAB/id_ed25519" -p 22240 -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$LAB/known_hosts" -o ConnectTimeout=3 root@127.0.0.1)
for i in $(seq 1 80); do "${SSH[@]}" true 2>/dev/null && break; sleep 3; done
"${SSH[@]}" 'cloud-init status --wait' || true
"${SSH[@]}" bash -s <<'GUEST'
set -euo pipefail
curl -fsSL https://get.k3s.io -o /tmp/install-k3s.sh
INSTALL_K3S_VERSION='v1.35.8+k3s1' sh /tmp/install-k3s.sh
for i in $(seq 1 90); do kubectl get nodes 2>/dev/null | grep -q ' Ready ' && break; sleep 2; done
kubectl wait --for=condition=Ready node --all --timeout=180s
for img in docker.io/library/nginx:1.27-alpine docker.io/library/busybox:1.37 docker.io/curlimages/curl:8.12.1 docker.io/rancher/mirrored-library-busybox:1.37.0; do k3s ctr images pull "$img" >/dev/null 2>&1; done
for i in $(seq 1 90); do kubectl -n kube-system get deployment traefik >/dev/null 2>&1 && break; sleep 2; done
kubectl -n kube-system rollout status deployment/traefik --timeout=240s
kubectl -n kube-system rollout status deployment/local-path-provisioner --timeout=180s
mkdir -p /home/student/.kube
cp /etc/rancher/k3s/k3s.yaml /home/student/.kube/config
chown -R student:student /home/student/.kube
chmod 600 /home/student/.kube/config
cat >> /home/student/.bashrc <<'BASH'
export KUBECONFIG=$HOME/.kube/config
alias k=kubectl
export PS1='\[\e[38;5;81m\]student@kubequest\[\e[0m\]:\w\$ '
BASH
printf 'KubeQuest lab. Run kubectl get pods -n quest to begin.\n' > /etc/motd
k3s ctr images ls > /root/kubequest-images.txt
sync
GUEST
"${SSH[@]}" poweroff || true
for i in $(seq 1 30); do kill -0 "$(cat build.pid)" 2>/dev/null || break; sleep 2; done
# Flatten to an independent immutable base; session disks are disposable overlays.
qemu-img convert -O qcow2 building.qcow2 template.qcow2
rm building.qcow2
chmod 440 template.qcow2
printf 'Template ready: Kubernetes v1.35.8+k3s1\n'
