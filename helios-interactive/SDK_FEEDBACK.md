# `@reactor-models/helios@0.8.4` — migration feedback

Context: migrating `helios-interactive/` off `@reactor-team/js-sdk` and onto the strongly-typed Helios wrapper. One file, four call sites, a small app. The typed API is a real improvement in authoring ergonomics (autocomplete on `setPrompt`, `schedulePrompt`, etc. is lovely), but I hit a set of real friction points. Ranked roughly by severity.

---

## 1. 🔥 Runtime does not match typed `HeliosMessage` shape

**Severity:** blocker — silently wrong. Types compile, code runs, nothing works.

`HeliosModel.onMessage(handler: (m: HeliosMessage) => void)` types messages as flat discriminated unions:

```ts
interface HeliosStateMessage {
  type: "state";
  current_frame: number;
  current_chunk: number;
  current_prompt: unknown;
  // ...
}
```

But the runtime implementation (`dist/index.mjs:86-92`) is a passthrough:

```js
onMessage(handler) {
  const wrappedHandler = (raw) => handler(raw);
  this.reactor.on("message", wrappedHandler);
  // ...
}
```

The underlying Reactor still emits `{ type: "state", data: { current_frame: ..., ... } }`. So `message.current_frame` is always `undefined` and `message.data.current_frame` is where the value actually lives — but TypeScript doesn't know that.

I caught this only because the video rendered (tracks work) while chunk counters stayed at 0 (messages silently dropped their values). If the consumer were a less visible piece of code, this would be a debugging nightmare.

**Fix suggestion:** either transform the nested `{ type, data: {...} }` into the flat shape the types promise inside `onMessage` / the `onXxx` helpers, or change the type definitions to match the actual nested shape. The transform path is cleaner for consumers.

Our workaround, localized to `lib/helios-react.tsx`:

```ts
return helios.onMessage((raw) => {
  const nested = raw as unknown as { type?: string; data?: unknown };
  const flat =
    nested?.data && typeof nested.data === "object"
      ? { type: nested.type, ...nested.data }
      : raw;
  handlerRef.current(flat as HeliosMessage);
});
```

---

## 2. React bindings advertised in the README but not shipped

**Severity:** high — forces every React consumer to re-do the same integration work.

The README documents `HeliosProvider`, `useHelios`, `useHeliosState`, `useHeliosCommandError`, etc. None of these are in `dist/index.d.ts` or the runtime export list for v0.8.4 — only `HeliosModel`, message types, and constants.

Since the project we migrated was an entire React app, this meant writing a small but nontrivial integration layer by hand: a provider that owns a `HeliosModel` instance, a hook for subscribing to status, a hook for subscribing to messages, and a video-rendering component. See `lib/helios-react.tsx` in this PR.

**Fix suggestion:** either ship the bindings or update the README so consumers don't think they're there. If bindings are coming, a comment like "coming soon in v0.9" would have saved us 30 minutes of looking for them.

---

## 3. No video-rendering component

**Severity:** high (compounds with #2).

The old SDK shipped `ReactorView` which handled the boring parts of video playback: picking the right track by name, building a `MediaStream`, wiring `srcObject`, `autoplay`/`muted`/`playsInline`, and the `videoObjectFit` prop. The typed SDK ships nothing equivalent.

Every consumer displaying Helios output will end up writing roughly the same ~30 lines (see `HeliosVideoView` in `lib/helios-react.tsx`). This is a great candidate for a first-class typed component — either framework-agnostic (return a `MediaStream`) or React-specific.

---

## 4. `current_prompt` typed as `unknown`

**Severity:** medium — minor ergonomic tax on every consumer.

`HeliosStateMessage.current_prompt: unknown` forces a `typeof x === "string" ? x : null` guard at every read site. `scheduled_prompts: Record<string, unknown>` has the same issue.

Based on actual message content, both are `string | null` (and `Record<string, string>` respectively). Either the generator didn't know, or the upstream schema is intentionally loose — but the rest of the typed surface is sharp, which makes this stand out.

---

## 5. No typed `clearImage()` method

**Severity:** medium — forces consumers to reach back into the untyped escape hatch.

The app needs to clear a previously-set reference image. `HeliosModel` has `setImage`, `setImageStrength` but no `clearImage`. The underlying model supports `sendCommand("clear_image", {})` — and our workaround is exactly that:

```ts
await helios.reactor.sendCommand("clear_image", {});
```

Every such escape-hatch call undermines the type-safety pitch of the SDK. If a command is reachable via the model, it should be exposed.

---

## 6. `FileRef` not re-exported

**Severity:** low — only bites consumers that want to annotate explicitly.

`HeliosSetImageParams.image: FileRef` references a type that isn't exported from `@reactor-models/helios`. It lives in `@reactor-team/js-sdk`, which consumers shouldn't need to depend on directly anymore. Our code got away with type inference everywhere, but a consumer that writes `const ref: FileRef = ...` would be forced to add the transitive dep back as a direct dep. Easy fix: re-export.

---

## 7. No first-class connection status channel on `HeliosModel`

**Severity:** low — works via escape hatch, but it's awkward.

`HeliosModel` exposes `connect()` / `disconnect()` but no typed status event, no `getStatus()`, and no `onStatusChanged()`. To mirror connection state into React, we had to subscribe on the raw reactor:

```ts
helios.reactor.on("statusChanged", (status) => setStatus(status));
```

If one of the design goals is to let consumers never touch `.reactor`, this gap matters. If consumers are expected to touch it, saying so in the README would be useful.

---

## 8. No `ConnectOptions` on `HeliosModel.connect`

**Severity:** low — behavioral drift from the old SDK.

Old `ReactorProvider` accepted `connectOptions={{ autoConnect: false }}` to prevent the provider from auto-connecting when the JWT arrived. `HeliosModel.connect(jwt?)` takes no options — you just don't call `connect()` to achieve the same behavior. Fine in practice, but worth documenting for migrators.

---

## What worked well (for balance)

- **Typed command methods** are a big quality-of-life improvement over `sendCommand("set_prompt", { prompt })`. Autocomplete, param docs in hover, no string typos.
- **Per-message subscription helpers** (`onState`, `onChunkComplete`, etc.) are a nice pattern once the runtime bug in #1 is fixed.
- **Dual ESM/CJS + single export path** — installed and resolved cleanly in the Next 15 / Turbopack setup with no config gymnastics.
- **`HeliosTracks` constant** exposing the track preset is a nice touch for consumers who want to build their own transport.

---

## TL;DR priority for the SDK author

1. **Ship the message transform** so `onMessage`'s handler arg actually matches `HeliosMessage`. This is silently wrong today.
2. **Ship (or remove from README) the React bindings.**
3. **Add a video-rendering primitive** or a documented pattern that all consumers can share.
4. **Tighten `current_prompt` to `string | null`.**
5. Add `clearImage()`, re-export `FileRef`, add a typed status channel.
