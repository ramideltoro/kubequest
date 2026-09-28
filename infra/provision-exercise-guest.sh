#!/usr/bin/env bash
# Run only inside the disposable KubeQuest guest while building its template.
set -euo pipefail
ip route replace default via 10.0.2.2 dev ens3
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq podman jq apache2-utils
curl -fsSL https://get.helm.sh/helm-v3.17.3-linux-amd64.tar.gz -o /tmp/helm.tgz
curl -fsSL https://get.helm.sh/helm-v3.17.3-linux-amd64.tar.gz.sha256sum -o /tmp/helm.sha256
(cd /tmp; sed 's/helm-v3.17.3-linux-amd64.tar.gz/helm.tgz/' helm.sha256 | sha256sum -c -)
tar -xzf /tmp/helm.tgz -C /tmp
install /tmp/linux-amd64/helm /usr/local/bin/helm
for img in nginx:1.18.0 nginx:1.19.8 nginx:1.19.9 nginx:1.24.0 nginx:1.28 nginx:1.28-alpine nginx:latest busybox:latest perl:5.34 dgkanatsios/simpleapp:latest; do case "$img" in */*) ref="docker.io/$img";; *) ref="docker.io/library/$img";; esac; k3s ctr images pull "$ref" >/dev/null 2>&1 || exit 1; done
for img in docker.io/library/httpd:2.4 docker.io/library/registry:2 docker.io/library/busybox:latest; do podman pull "$img"; done
set -euo pipefail
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq busybox-static
BASE=/opt/kubequest-fixtures
mkdir -p "$BASE/charts/web/templates" "$BASE/repo" "$BASE/registry-public" "$BASE/registry-private/data" "$BASE/registry-private/auth" "$BASE/registry-private/certs"
cat > "$BASE/charts/web/Chart.yaml" <<'YAML'
apiVersion: v2
name: web
description: KubeQuest offline web chart
type: application
version: 1.0.0
appVersion: "1.28"
YAML
cat > "$BASE/charts/web/values.yaml" <<'YAML'
replicaCount: 1
image: nginx:1.28
YAML
cat > "$BASE/charts/web/templates/deployment.yaml" <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
      - name: web
        image: {{ .Values.image }}
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
YAML
printf 'replicaCount: 2\n' > "$BASE/charts/myvalues.yaml"
printf 'replicaCount: 3\n' > "$BASE/charts/override.yaml"
helm package "$BASE/charts/web" -d "$BASE/repo"
helm repo index "$BASE/repo" --url http://127.0.0.1:8879
cat > /etc/systemd/system/kubequest-chart-repo.service <<'UNIT'
[Unit]
Description=KubeQuest offline practice chart repository
After=network.target
[Service]
ExecStart=/usr/bin/busybox httpd -f -p 8879 -h /opt/kubequest-fixtures/repo
Restart=no
[Install]
WantedBy=multi-user.target
UNIT
htpasswd -Bbc "$BASE/registry-private/auth/htpasswd" student practice-password >/dev/null 2>&1
openssl req -newkey rsa:2048 -nodes -sha256 -keyout "$BASE/registry-private/certs/key.pem" -x509 -days 3650 -out "$BASE/registry-private/certs/cert.pem" -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' >/dev/null 2>&1
cat > /etc/systemd/system/kubequest-registry.service <<'UNIT'
[Unit]
Description=KubeQuest public practice registry
After=network.target
[Service]
ExecStart=/usr/bin/podman run --rm --name lab-registry -p 5000:5000 -v /opt/kubequest-fixtures/registry-public:/var/lib/registry docker.io/library/registry:2
ExecStop=/usr/bin/podman stop lab-registry
Restart=no
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/kubequest-private-registry.service <<'UNIT'
[Unit]
Description=KubeQuest authenticated practice registry
After=network.target
[Service]
ExecStart=/usr/bin/podman run --rm --name lab-private-registry -p 5001:5000 -v /opt/kubequest-fixtures/registry-private/data:/var/lib/registry -v /opt/kubequest-fixtures/registry-private/auth:/auth:ro -v /opt/kubequest-fixtures/registry-private/certs:/certs:ro -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=KubeQuest -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/cert.pem -e REGISTRY_HTTP_TLS_KEY=/certs/key.pem docker.io/library/registry:2
ExecStop=/usr/bin/podman stop lab-private-registry
Restart=no
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/rancher/k3s/registries.yaml <<'YAML'
mirrors:
  "localhost:5000":
    endpoint:
    - "http://127.0.0.1:5000"
  "localhost:5001":
    endpoint:
    - "https://localhost:5001"
configs:
  "localhost:5001":
    tls:
      insecure_skip_verify: true
YAML
# Load this configuration when the QA batch has finished, before template flattening.
systemctl daemon-reload
systemctl enable --now kubequest-chart-repo kubequest-registry kubequest-private-registry
mkdir -p /usr/local/libexec
cat > /usr/local/libexec/kubequest-podman <<'WRAPPER'
#!/bin/bash
/usr/bin/podman "$@"
status=$?
if test -f /home/student/auth.json; then chown student:student /home/student/auth.json; chmod 600 /home/student/auth.json; fi
exit "$status"
WRAPPER
chmod 755 /usr/local/libexec/kubequest-podman
printf 'student ALL=(root) NOPASSWD: /usr/local/libexec/kubequest-podman *\n' > /etc/sudoers.d/kubequest-podman
printf '#!/bin/sh\nexec sudo /usr/local/libexec/kubequest-podman "$@"\n' > /usr/local/bin/podman
chmod 755 /usr/local/bin/podman
printf 'exercise-labs-v1\n' > "$BASE/version"
rm -f "$BASE/podman-base-images.tar"
/usr/bin/podman save -m -o "$BASE/podman-base-images.tar" docker.io/library/httpd:2.4 docker.io/library/registry:2 docker.io/library/busybox:latest
sync
printf 'Offline fixtures installed; K3s restart still required.\n'
