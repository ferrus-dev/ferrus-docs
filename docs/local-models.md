---
id: local-models
title: Tuning local models (Qwen, Gemma)
sidebar_position: 7
slug: /local-models
---

# Tuning local models

There are two local-model-friendly executors:

- **[Nano](/docs/nano)** (new in 0.5): ferrus's own native harness. It talks
  directly to LM Studio's OpenAI-compatible endpoint and runs headless as
  the executor only.
- **`goose`**: MCP-native, needs no project config file, and works well
  against a local LM Studio or Ollama endpoint set with `goose configure`.
  See [Supported agents](/docs/agents).

`opencode` can also drive a local model, but only for the supervisor/
reviewer role today.

Dogfooding ferrus against local models — most extensively
[**Qwen3.6-35B-A3B**](https://huggingface.co/Qwen/Qwen3.6-35B-A3B) as the
executor, with [**Gemma-4-26B-A4B**](https://huggingface.co/google/gemma-4-26B-A4B)
tested alongside it — turned up a handful of tuning knobs that matter far
more than model choice for whether the executor loop stays stable. Both are
mixture-of-experts models with a small active path (A3B ≈ 3B active, A4B ≈
4B active). Qwen3.6-35B-A3B held up well end to end; Gemma-4-26B-A4B was
workable but drifted on specific edge-case tasks. None of this is
ferrus-specific — it's how these models are meant to be run — but it's easy
to leave on defaults that actively hurt tool-calling reliability in an agent
loop.

## Why default settings hurt agent loops specifically

A chat session tolerates a model that occasionally rambles or repeats
itself — you just re-prompt it. An unattended executor can't: a malformed
tool call, a repetition loop, or a dropped `<think>` block turns into a
wasted turn, a `--max-tool-repetitions` trip, or a respawned session (see
[`max_executor_dispatches`](/docs/configuration#limits)). The knobs below
are ranked roughly by how much they reduce *that* failure mode, not by how
much they improve raw benchmark scores.

## 1. Sampling — the most underrated lever

Qwen3 in thinking mode has official recommended sampling parameters. If
you're running below them, this is usually the highest-leverage fix:

| Parameter | Qwen3 thinking-mode recommendation |
|---|---|
| `temperature` | 0.6 |
| `top_p` | 0.95 |
| `top_k` | 20 |
| `min_p` | 0 |
| `presence_penalty` | 1.0–1.5 |

These numbers are **Qwen3-specific** — they come from Qwen's own guidance,
not from ferrus. For another model family (Gemma included) start from that
model's own recommended defaults instead of copying this table verbatim.

:::note[Nano]
`nano.toml` accepts only `temperature` from this table. It rejects unknown
keys, so set `top_p`, `top_k`, `min_p`, and `presence_penalty` as the
loaded model's defaults in LM Studio.
:::

A temperature noticeably below 0.6 (e.g. 0.4) is *below* what Qwen3 was
tuned for, and the model's own guidance warns that low temperature in
thinking mode provokes looping and repeated output. If you're seeing
`--max-tool-repetitions` trip or unexplained executor respawns, check
sampling before anything else. `presence_penalty` defaults to 0 in most
runtimes; nudging it into the 1.0–1.5 range pushes back directly on loop
behavior, while above ~1.5 risks language mixing in the output.

## 2. Context length — probably hurting you for free

The Qwen3 family's native context is around 32K, extendable via YaRN to
~131K. Setting context far beyond that (e.g. 256K) forces aggressive RoPE
scaling that measurably degrades quality on short tasks — and most agent
tasks are short relative to the window. Unless a task genuinely needs a huge
context, 32–64K is both **more correct** and frees memory for a better
quantization (below). This is close to a free win: better output *and* lower
memory pressure from one change.

## 3. Quantization: 4-bit → 6-bit (not 8-bit)

Qwen3.6-35B-A3B is a mixture-of-experts model with only ~3B active
parameters per forward pass. MoE models with a small active path are hit
*harder* by quantization than a dense model of the same total size — few
weights do the work on any given token, so each one "weighs more."

- **4 → 6-bit** (Q6_K / 6-bit MLX) is a real jump, recovering most of the
  gap to fp16. It mainly cuts "dumb" mistakes and malformed tool-call
  formatting — it sharpens reliability, it doesn't add capability.
- **6 → 8-bit** is marginal and rarely worth the extra memory/speed cost.

Rough memory budget for a ~30–35B MoE of this class (weights only, plus KV
cache on top): 4-bit ≈ 17–20GB, 6-bit ≈ 25–28GB, 8-bit ≈ 32–36GB. Freeing
headroom by trimming context (above) is what usually makes 6-bit affordable.

## 4. Structured output (constrained decoding)

Constraining tool-call output to a schema reduces malformed/invalid calls,
which directly means fewer wasted turns and fewer executor respawns —
this affects **format reliability**, not reasoning quality. Worth enabling
for `goose`, which drives native tool-calling. The tradeoff: an overly
rigid grammar can occasionally constrain reasoning quality, so A/B it on a
representative task rather than assuming it's a free win.

## 5. Thinking mode vs. preserving thinking — two different toggles

These are easy to conflate and have opposite recommendations:

- **Thinking mode itself** (`enable_thinking` / `/think`) should be **on**
  for anything beyond trivial edge cases — it gives a real correctness
  boost on subtle contract-level bugs. Double-check your runtime (goose,
  LM Studio, …) isn't silently disabling it.

  Nano is a deliberate exception. Its generated `nano.toml` sets
  `reasoning_effort = "none"`, because reasoning shares one output allowance
  with the tool calls and patch text. To turn thinking on, set
  `reasoning_effort` (for example `"medium"`). If `ferrus --debug` then
  shows frequent output-limit continuations, raise `max_output_tokens`, or
  remove it so Nano allocates the output budget automatically.
- **Preserving thinking** — carrying previous turns' `<think>` blocks
  forward in multi-turn history — should stay **off**. Qwen3's own
  guidance says to strip reasoning from history in multi-turn use: the
  model isn't trained to consume its own past thinking, and it just
  bloats context for no benefit.

## 6. Smaller wins

- **KV-cache quantization (Q8)** — close to lossless, frees meaningful
  memory for the model weights or context.
- **Flash attention** — enable it; no real downside on supported hardware.
- Spend a fixed memory budget in this order: 6-bit weights → 32–64K
  context → Q8 KV cache, rather than maxing out any one of them first.

## Recommended starting point

The sampling rows below are the **Qwen3** baseline — keep the quantization,
context, and thinking-mode rows for any model, but swap the sampling numbers
for your model family's own recommendations:

| Parameter | Common default | Try instead (Qwen3) |
|---|---|---|
| Quantization | 4-bit | 6-bit |
| Context | 256K | 32–64K |
| `temperature` | 0.4 | 0.6 |
| `top_p` / `top_k` / `min_p` | unset | 0.95 / 20 / 0 |
| `presence_penalty` | 0 | 1.0–1.5 |
| Structured output | off | on (A/B on a real task) |
| Preserve thinking | off | leave off |
| Thinking mode | unverified | confirm it's on |

## How to A/B this

Change **one** variable at a time and re-run the same representative
executor task before changing the next — otherwise you can't tell which
change actually helped. Rough order of expected impact:

1. Sampling per the table above (especially `presence_penalty`) + trimming
   context to 32–64K
2. 4-bit → 6-bit quantization
3. Structured output

Leave "preserve thinking" off throughout.

These knobs raise the *reliability* ceiling — fewer malformed calls, fewer
loops, fewer respawns. They don't raise the *reasoning* ceiling: on subtle,
contract-level bugs, the biggest remaining lever is still sharpening the
task description itself, the same way it would be for a hosted model.

## Gemma and other local models

The same shape of tuning applies to other local backends, but check the
specific model's own recommended sampling defaults rather than reusing
Qwen3's numbers verbatim — they differ by model family.
[Gemma-4-26B-A4B](https://huggingface.co/google/gemma-4-26B-A4B) is the
clearest example from our testing: it performed well generally but "drifted"
on specific edge cases, which is usually a sign to revisit sampling and
context first before concluding the model itself is the limiting factor.
