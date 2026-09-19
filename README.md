# KubeQuest

A public Kubernetes learning portal with ten visual beginner lessons and eight original CKAD practice missions. Live labs and the local AI tutor are restricted to the owner using verified Google sign-in. Uses official Kubernetes and CNCF artwork, React/Vite, Fastify, SQLite, QEMU/KVM, K3s, and an existing Ollama service.

Website: https://kubequest.ramideltoro.com

## Development

Use Node 22.22 or newer. Run `npm ci`, `npm test`, and `npm run build`. Start the backend with `npm start`; Vite development is available through `npm run dev` in a second terminal. Without Google credentials, all public learning remains available and private endpoints fail closed. No development authentication bypass is included.

The backend binds to loopback port 4340. Production requires the environment variables in `.env.example`, a prepared lab template, and the supplied systemd unit. Environment loading is performed by systemd in production; export variables explicitly for local testing.

See [operations](docs/OPERATIONS.md), [content authoring](docs/AUTHORING.md), and [validation](docs/VALIDATION.md). The app is an independent educational project, not affiliated with Kubernetes, CNCF, or The Linux Foundation.
