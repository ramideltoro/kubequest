export type Resource = {
  title: string;
  provider: string;
  kind: string;
  access: string;
  url: string;
  description: string;
};
export const resources: Record<string, Resource> = {
  web: {
    title: "Learn web development",
    provider: "MDN Web Docs",
    kind: "Learning path",
    access: "Free reading",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    description:
      "Start with the getting-started modules. Learn what browsers and websites do before writing much code.",
  },
  git: {
    title: "Introduction to GitHub",
    provider: "GitHub Skills",
    kind: "Interactive course",
    access: "GitHub account needed",
    url: "https://github.com/skills/introduction-to-github",
    description:
      "Practice a branch, a commit, and a pull request in a small guided repository.",
  },
  actions: {
    title: "Hello GitHub Actions",
    provider: "GitHub Skills",
    kind: "Interactive course",
    access: "GitHub account needed",
    url: "https://github.com/skills/hello-github-actions",
    description:
      "Create a simple workflow after you understand what a pipeline is. Review GitHub usage limits before running exercises.",
  },
  linux: {
    title: "Introduction to Linux (LFS101)",
    provider: "The Linux Foundation",
    kind: "Course",
    access: "Free course · account needed",
    url: "https://training.linuxfoundation.org/training/introduction-to-linux/",
    description:
      "Build confidence with files, commands, processes, and the operating system used on many servers.",
  },
  docker: {
    title: "Run a containerized application",
    provider: "Docker",
    kind: "Hands-on tutorial",
    access: "Free reading · local setup",
    url: "https://docs.docker.com/get-started/tutorials/run-an-app/",
    description:
      "Move from the browser model to a real container. Follow the setup instructions before starting.",
  },
  dns: {
    title: "What is DNS?",
    provider: "Cloudflare Learning Center",
    kind: "Explainer",
    access: "Free reading",
    url: "https://www.cloudflare.com/learning/dns/what-is-dns/",
    description:
      "Follow how a readable website name leads to an address. Useful alongside the networking lessons.",
  },
  progit: {
    title: "Pro Git: getting started",
    provider: "Git project",
    kind: "Book",
    access: "Free reading",
    url: "https://git-scm.com/book/en/v2",
    description:
      "Use the first two chapters for a slower explanation of snapshots, local work, and sharing changes.",
  },
  kube: {
    title: "Introduction to Kubernetes (LFS158)",
    provider: "The Linux Foundation",
    kind: "Course",
    access: "Free course · account needed",
    url: "https://training.linuxfoundation.org/training/introduction-to-kubernetes/",
    description:
      "A structured next step after the visual lessons. Expect more terminology and some setup.",
  },
  kubetutorial: {
    title: "Learn Kubernetes Basics",
    provider: "Kubernetes project",
    kind: "Tutorial series",
    access: "Free reading · cluster setup",
    url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
    description:
      "Practice deploying, exploring, exposing, scaling, and updating an app using the official walkthroughs.",
  },
  developer: {
    title: "Kubernetes for Developers (LFD259)",
    provider: "The Linux Foundation",
    kind: "Course",
    access: "Paid · check current price",
    url: "https://training.linuxfoundation.org/training/kubernetes-for-developers/",
    description:
      "A deeper application-focused course to consider after the Basics path. Check prerequisites and the current syllabus before enrolling.",
  },
  tasks: {
    title: "Kubernetes tasks",
    provider: "Kubernetes project",
    kind: "Reference exercises",
    access: "Free reading · cluster needed",
    url: "https://kubernetes.io/docs/tasks/",
    description:
      "Target the task you need to practice: configuration, probes, resources, Jobs, or networking.",
  },
};
export function resourceKeys(section: string, topic = "") {
  if (section === "ckad") return ["developer", "tasks", "kube"];
  if (section === "basics") return ["kube", "kubetutorial", "docker"];
  if (/git/.test(topic)) return ["git", "progit"];
  if (/pipeline|build/.test(topic)) return ["actions", "git"];
  if (/container/.test(topic)) return ["docker", "kube"];
  if (/dns|network/.test(topic)) return ["dns", "web"];
  if (/server|deploy|config|storage/.test(topic)) return ["linux", "web"];
  if (/orchestration/.test(topic)) return ["kube", "docker"];
  return ["web", "git", "linux"];
}
