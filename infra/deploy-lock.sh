#!/bin/sh
set -eu
exec /usr/bin/flock -n /run/lock/kubequest-deploy.lock /usr/bin/node /usr/local/libexec/kubequest-release.mjs "$@"
