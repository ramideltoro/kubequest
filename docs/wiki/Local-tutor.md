# Optional local AI tutor

The tutor uses the existing Ollama `qwen2.5:7b` model on the home server. It is available only after owner authorization and only for an eligible current session. Timed attempts deny assistance until submission.

![Communication diagram: authorized question, reviewed content, sanitized evidence, inference and fallback](diagrams/communication.svg)

## Context and limits

The backend selects the reviewed mission brief, objectives and explanation, then adds a bounded sanitized resource summary. It sends the learner's question as a separate user message. Resource names and user text are untrusted data. Secret values and arbitrary cluster configuration are not supplied as tutor context.

The application allows one inference request at a time. Its request uses a 4,096-token context setting, at most 400 predicted tokens, four model threads, low temperature, and a short keep-alive period. These settings bound application demand, but actual latency depends on other host workloads and whether the model is already loaded.

## Authority

The model has **no tools and cannot execute commands**. It cannot apply YAML, start or reset labs, change content, or decide grades. Suggestions can be wrong; validate them with Kubernetes observations and the authored checks. The application never treats model text as trusted instructions for the host.

## Failure behavior

If inference fails, times out, or returns an unusable result, the application returns the reviewed first hint and explanation. Authored hints and solutions remain available without the model. The UI identifies fallback guidance so the learner understands what happened.

## Resource evidence

During initial qualification, a real tutor response completed in approximately 29 seconds including model load. The model process reached about 4.8 GiB resident memory during a short sample; the VM used about 2 GiB. These are observations from that host at that time, not a throughput guarantee or sustained-load benchmark. See [validation](Validation.md) and [operations](Operations.md).
