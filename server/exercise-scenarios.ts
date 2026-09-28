import recipes from "./exercise-labs.json";
export type ExerciseLab = {
  id: string;
  namespace: string;
  setup: string;
  solution: string;
  checks: { label: string; command: string }[];
};
export const exerciseLabs = recipes as Record<string, ExerciseLab>;
export function exerciseScript(script: string) {
  return (
    "set -euo pipefail\ncd /home/student\nexport KUBECONFIG=/etc/rancher/k3s/k3s.yaml\nexport HELM_CONFIG_HOME=/home/student/.config/helm HELM_CACHE_HOME=/home/student/.cache/helm HELM_DATA_HOME=/home/student/.local/share/helm\n" +
    script
  );
}
