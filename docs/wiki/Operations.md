# Operations and recovery

The portal runs on the existing home AI server. No additional paid hosting, database, AI service, or runner is introduced. This page describes the current installation; lower-level template and service details are also in [the operations source document](https://github.com/ramideltoro/kubequest/blob/main/docs/OPERATIONS.md).

## Files and services

| Location or service | Purpose |
| --- | --- |
| `/opt/kubequest/releases/<SHA>` | Immutable application releases |
| `/opt/kubequest/current` | Active release symlink |
| `/etc/kubequest/runtime.env` | Root-only runtime secrets and configuration |
| `/var/lib/kubequest/kubequest.sqlite` | Private completion and attempt data |
| `/var/lib/kubequest/backups` | Fourteen rotating local SQLite backups |
| `/var/lib/kubequest/lab` | Template, guest identity, pinned host keys and disposable overlay |
| `/usr/local/libexec/kubequest-*` | Root-installed restricted deployment helpers |
| `/etc/ssh/authorized_keys/kubequest-deploy` | Root-managed restricted deployment public key |
| `/run/kubequest-deploy/maintenance` | Temporary marker preventing new labs during activation |
| `kubequest.service` | Fastify portal and child VM processes |
| `kubequest-backup.timer` | Daily online database backup |
| Existing `cloudflared` and `ollama` services | Publication and optional tutoring |

## Configuration

The environment requires `PUBLIC_ORIGIN`, `PORT`, `DB_PATH`, `LAB_DIR`, `SESSION_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`. Production uses HTTPS, loopback port 4340, and runtime data outside `/opt/kubequest`. Use the central credential store when provisioning. Never print secret values during diagnosis or include them in support screenshots.

The systemd service runs as `kubequest` with KVM access, a strict read-only system view, no new privileges, restricted home access, private temporary files, and writable access only to its data directory. Its 12-GiB/500%-CPU ceiling includes the 4-vCPU/8-GiB guest. Existing host services remain separate.

## Routine checks

```sh
systemctl status kubequest --no-pager
curl -fsS http://127.0.0.1:4340/healthz
systemctl list-timers kubequest-backup.timer
journalctl -u kubequest --since '30 minutes ago' --no-pager
readlink -f /opt/kubequest/current
```

The public health endpoint reports release identity, Google configuration and template availability. It does not prove every mission works. Check the public portal and a private owner session when qualifying a lab-related release.

## Install or rebuild a host

1. Use x86-64 Linux with hardware virtualization, Node 22.22 or newer, QEMU/KVM utilities, OpenSSH, curl and cloud-image utilities. Verify access to `/dev/kvm`.
2. Create the `kubequest` service user and private data directory, grant only KVM group access, and install the versioned systemd service.
3. Prepare the lab template with `infra/build-template.sh` during a maintenance window. Building temporarily needs access to official image sources; runtime networking is restricted. Preserve the matching generated SSH identity and pinned guest host key.
4. Install a tested release and root-only runtime environment. Configure the exact Google callback without removing callbacks used by other sites.
5. Install and enable the backup service/timer. Validate an online backup and an isolated restore.
6. Add the public hostname to the existing Cloudflare Tunnel while preserving its other ingress entries and fallback.
7. Install `infra/deploy-receive.mjs`, `deploy-lock.sh`, `deploy-release.mjs` and `release-format.mjs` as root-owned helper files. Create the dedicated deploy user, restricted authorized key, SSH match rules and narrow sudo entry. Never give the deploy user unrestricted sudo.
8. Set the four production environment secrets and restrict deployments to `main`. Run the full workflow and confirm public health reports the deployed commit.

Template rebuilds require a matching known-hosts record. Do not disable SSH host verification to hide a mismatch. A template change should rerun all mission behavior and isolation tests.

## Backups and restore

`infra/backup.mjs` uses SQLite's online backup API and verifies integrity. The daily timer retains the latest fourteen snapshots with private file permissions. A pre-activation backup also runs during deployment. These copies protect against application mistakes, not physical host loss.

To restore private progress, first stop the portal during an agreed idle window, preserve the current database and its WAL/SHM files in a separate private recovery directory, then copy a chosen verified backup to the configured database path with `kubequest` ownership and mode 0600. Remove stale WAL/SHM files only after preserving them and while the service is stopped. Restart, run `PRAGMA integrity_check` against an isolated copy, and compare attempt/completion counts. Never overwrite the only recovery copy.

The disposable session disk is not backed up. The template can be rebuilt; runtime secrets and the matched template identity need private recovery handling outside the public repository.

## Recovery cases

| Symptom | Response |
| --- | --- |
| Active lab blocks deployment | Stop the lab normally, then rerun the failed deployment job |
| New release fails local health | Helper restores the prior release automatically; inspect the failed workflow and service log |
| Public site fails but local health succeeds | Check the existing Cloudflare tunnel and DNS before reverting healthy code |
| New starts remain in maintenance | Confirm no deployment process/lock is active, then an administrator may remove the stale marker; it also disappears on reboot |
| Browser terminal disconnects | Reconnect using the current session; if it expired, start a new mission |
| Guest SSH key mismatch | Verify the template/identity pairing and regenerate through trusted provisioning |
| Lab setup fails | Check KVM access, template presence, available disk/RAM and guest logs; reset after fixing the cause |
| Tutor unavailable | Continue with authored hints; inspect the existing Ollama service and model availability |
| Server or portal unexpectedly restarts | Startup removes orphaned VM state; saved attempts persist but active workload changes are lost |

Keep at least one known-good compatible release installed. Prune old root-owned releases only after checking the current symlink and rollback needs. Do not delete runtime data as part of ordinary code cleanup.
