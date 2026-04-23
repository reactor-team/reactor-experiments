# Migration scratchpad: `@reactor-team/js-sdk` → `@reactor-models/helios`

> Raw journal. Friction points get polished in `SDK_FEEDBACK.md`.

## Task

Davide (Slack, 2026-04-23 4:48 PM): migrate `helios-interactive/` off the loosely-typed `@reactor-team/js-sdk` onto the strongly-typed `@reactor-models/helios` wrapper. Open a PR. Surface friction points to pass back to his coworker who authors the typed SDK.

Branch: `willem/strongly-typed-helios` (already created).

## Exploration findings (before touching code)

Ran two Explore agents in parallel:

1. **Current-usage map.** Only 4 files import from the old SDK:
   - `app/page.tsx` — `ReactorProvider`, `ReactorView` at the top level.
   - `components/HeliosController.tsx` — main surface: `useReactor` (selector for `sendCommand`, `status`, `uploadFile`), `useReactorMessage` (handler for `state` and `conditions_ready` messages), `FileRef` import that turns out to be **unused** (return of `uploadFile` is only used by inference).
   - `components/ReactorStatus.tsx` — `useReactor` for `status`/`connect`/`disconnect`.
   - `components/StatusBar.tsx` — same as `ReactorStatus`.
   - Hand-rolled message types at `HeliosController.tsx:17-46` — the project invented its own loose `HeliosMessage` union with a `{ type, data: { … } }` shape.
   - Commands used: `set_prompt`, `start`, `schedule_prompt`, `set_image`, `clear_image`, `reset`.

2. **Typed SDK surface** (`@reactor-models/helios@0.8.4`).
   - Dual ESM/CJS, 0.8.4. Depends on `@reactor-team/js-sdk@^2.9.1` (so the old SDK stays as a transitive dep; we can't actually eliminate it from the tree).
   - Exports: `HeliosModel` class, `HeliosMessage` discriminated union + per-variant types (`HeliosStateMessage`, `HeliosConditionsReadyMessage`, etc.), param types (`HeliosSetPromptParams`, `HeliosSchedulePromptParams`, `HeliosSetImageParams`, `HeliosSetImageStrengthParams`, `HeliosSetSeedParams`, `HeliosSetSrScaleParams`), constants (`MODEL_NAME`, `MODEL_VERSION`, `HeliosTracks`).
   - `HeliosModel` methods: `connect(jwt)`, `disconnect()`, `start()`, `pause()`, `resume()`, `reset()`, `setPrompt`, `schedulePrompt`, `setImage`, `setImageStrength`, `setSeed`, `setSrScale`, `uploadFile`, plus `onMessage`/`onState`/`onCommandError`/`onChunkComplete`/`onImageAccepted`/`onPromptAccepted`/`onConditionsReady`/`onGenerationPaused`/`onGenerationResumed`/`onGenerationStarted`. Also `readonly reactor: Reactor` escape hatch.
   - **No React bindings exported.** README claims `HeliosProvider`, `useHelios`, `useHeliosState`, etc., but `dist/index.d.ts` ships none. This is the biggest gotcha.
   - Typed messages use a **flat** shape: `{ type: "state", current_frame, current_chunk, current_prompt, ... }`. The old app-defined union used `{ type, data: { current_frame, ... } }`. Different wire shape from what the app assumes — confirms the typed SDK is re-shaping messages (flattening).

3. **Bridging feasibility check.** Third Explore agent poked at `@reactor-team/js-sdk` internals to see whether `ReactorProvider` could adopt an externally-constructed `HeliosModel`'s reactor. Result: `ReactorProvider` unconditionally constructs its own `new Reactor(...)` inside a zustand store; no prop accepts an external one. If we instantiate `HeliosModel` alongside `ReactorProvider` we get two independent WebRTC connections fighting each other. So the clean path is: **drop `ReactorProvider` entirely**, hand-roll a thin React shell around `HeliosModel`.

## Decision: hand-roll `lib/helios-react.tsx`

The React layer is small:
- Single `HeliosModel` stored in a `useRef` (kept stable across renders).
- Mirror `helios.reactor`'s `statusChanged` into React state so components can re-render on connection transitions.
- `useHeliosMessage` wraps `helios.onMessage` with the handler-ref pattern so inline closures don't re-subscribe every render.
- `HeliosVideoView` subscribes to `helios.reactor.on("trackReceived", ...)`, filters `main_video`, builds a `MediaStream`, attaches to `<video>`. Mirrors old `ReactorView` behavior using the `Reactor` escape hatch.

Status enum strings match the old SDK (`disconnected | connecting | waiting | ready`), so the UI's status-switch branches don't need to change.

## Dead ends I considered

- **Keep `ReactorProvider`, sprinkle in typed helpers.** Rejected — would leave the app half-migrated and wouldn't actually exercise the typed API. Also Davide explicitly said "not use the original js-sdk".
- **Import `ReactorProvider` from `@reactor-models/helios/node_modules/@reactor-team/js-sdk`.** Rejected — hacky, brittle, defeats the point.
- **Re-export `Reactor` / `ReactorProvider` from our `lib/helios-react`.** Rejected — we'd just be papering over the missing React bindings. Better to feel the friction and write it down.

## Friction points (living list — updated as I hit them)

*Will fill this in as the migration proceeds. Each entry gets timestamp, what I tried, what the SDK did, what I wound up doing.*

1. **React bindings advertised but not shipped in 0.8.4.**
   The README prominently documents `HeliosProvider`, `useHelios`, `useHeliosState`, etc., but `dist/index.d.ts` contains zero of them. Had to hand-roll `lib/helios-react.tsx`. If the typed SDK is meant for React consumers (which the README strongly implies), this gap is the #1 blocker.

2. **Types lie about the runtime wire format.** 🔥
   `HeliosModel.onMessage(handler: (m: HeliosMessage) => void)` types `HeliosMessage` as a flat discriminated union, e.g. `{ type: "state", current_frame: number, current_chunk: number, ... }`. But the runtime `onMessage` implementation is literally just `this.reactor.on("message", handler)` — **no transformation at all**. The underlying Reactor emits nested `{ type: "state", data: { current_frame, current_chunk, ... } }`, which is what the consumer actually receives.
   Evidence: `node_modules/@reactor-models/helios/dist/index.mjs:86-92` is a passthrough. And the pre-migration app code was accessing `message.data.current_frame` with a hand-rolled `{ type, data: {...} }` interface — it was correct, the typed SDK is wrong.
   Caught this during smoke test: chunks weren't counting, "Now playing" didn't appear, but frames WERE rendering. After confirming the flat-field accesses were reading `undefined`, I added a flattening adapter in `useHeliosMessage` so the consumer sees the flat shape the types promise. Workaround localized to `lib/helios-react.tsx`.

3. **`current_prompt: unknown`** in `HeliosStateMessage`.
   Both the string prompt and a null sentinel are legitimate (they come from the model), but the type is `unknown` which forces every consumer to `typeof x === "string" ? x : null` or cast. `string | null` would be correct and ergonomic. Same for `scheduled_prompts: Record<string, unknown>` — the values are prompt strings.

4. **No typed equivalent for `clear_image`.**
   `HeliosModel` exposes `setImage`, `setImageStrength`, but no `clearImage()`. The underlying model protocol supports `sendCommand("clear_image", {})` — the old app used it. Had to drop to the escape hatch: `helios.reactor.sendCommand("clear_image", {})`. That leaks the untyped layer back into consumer code for what should be a first-class typed method.

5. **No video rendering primitive.**
   Old SDK shipped `ReactorView` which binds a MediaStreamTrack to a `<video>` with sensible defaults (autoplay muted playsInline, objectFit, etc). Typed SDK ships nothing equivalent. Had to write `HeliosVideoView` — basically a ~30-line reimplementation of the old one, using `helios.reactor.on("trackReceived", (name, track) => ...)` to pick up `main_video`.

6. **`FileRef` not re-exported.**
   `HeliosSetImageParams.image` is typed `FileRef`, but `FileRef` is NOT part of the `@reactor-models/helios` exports. Consumers that want to annotate it explicitly must reach into the transitive dep (`@reactor-team/js-sdk`), or rely on type inference from `HeliosModel.uploadFile`'s return. In our case we got lucky — all uses are inferred — but a type-annotated consumer would be stuck.

7. **No `connectOptions` / `autoConnect` parity.**
   Old `ReactorProvider` accepted `connectOptions={{ autoConnect: false }}`. `HeliosModel.connect(jwt?)` takes no options at all, which is actually fine (you just don't call `connect()` to avoid auto-connecting) but it's a behavioral drift worth calling out for migrators.

8. **JWT is an arg to `connect`, not a constructor option.**
   Subtle but forced a small React-pattern change: we can't bake the JWT into the `HeliosModel` at construction time and forget about it; we have to plumb a `jwtToken` prop through the provider and pass it at `connect()` call time. Works, but means `connect()` in React land needs a closure over the latest token. Handled with a ref in `HeliosProvider`.

9. **Status enum leaks through `reactor.on("statusChanged", ...)`.**
   To mirror the connection status into React state, I had to subscribe on the `helios.reactor` escape hatch — `HeliosModel` doesn't expose a typed status event or a `getStatus()`. If the SDK's goal is to avoid consumers ever touching `.reactor`, it needs a first-class status channel.

## Journey notes / timeline

- Explored in parallel: current app, typed SDK surface, old-SDK React-bindings internals. Found the React-bindings gap immediately.
- Designed `lib/helios-react.tsx` as a minimal clone of the old SDK's `ReactorProvider` patterns but bound to `HeliosModel`.
- Migration of 4 consumer files was mechanical — call-site-by-call-site swap.
- `pnpm build` clean on the first try.
- Dev server smoke test: video rendered immediately (big win: `HeliosVideoView` worked first-try), but chunk counter stayed at 0 and "Now playing" didn't appear. Read `index.mjs`, confirmed the onMessage passthrough, added the flatten adapter. Second smoke-test run: chunks climbed to 99, prompt displayed, reset and disconnect both clean.
- Initial smoke test skipped `setImage`/`uploadFile`/`clearImage`/`schedulePrompt` for time. Came back and ran a second smoke pass covering all four:
  - **`uploadFile` + `setImage`** via Village Puppy click — the video correctly anchored on the puppy image (rendered a golden-retriever scene matching the reference). This also exercises `conditions_ready` (which would never resolve if the flatten fix weren't in place — silent success signal).
  - **`schedulePrompt`** via clicking Rainy Evening while generation was running — chunk counter stayed advancing, `current_prompt` swapped to the Rainy Evening text, visuals transitioned. Identical to the first-prompt path except for the sendCommand target.
  - **`clear_image` escape hatch** via the Remove button — preview cleared instantly, generation kept running, subsequent prompt switch (King of the Jungle after clear) rendered without any residual puppy anchoring. Visual confirmation that the server accepted the clear.
  - **File-picker upload path** via the real hidden `<input type="file">`, driven with chrome-devtools `upload_file` against the Upload button — preview appeared (blob URL), generation stayed healthy. Confirms the manual-upload branch is equivalent to the example-button branch.
  - Installed a monkeypatch on `RTCDataChannel.prototype.addEventListener` mid-session to sniff for `command_error` messages on the wire. Zero observed across upload, setImage, schedulePrompt, clear_image, re-upload, and subsequent generation. (Caveat: the patch wraps new listener registrations — the data-channel listener was already bound before patching, so the sniffer is best-effort. The strongest signal is that the app behaved correctly end-to-end.)
- No new SDK friction points discovered in the second smoke pass. All known friction (flatten, no typed clearImage, no React bindings, etc.) is already captured.

## Small things I noticed but didn't file

- Dev warnings about `<Image>` width/height — unrelated, pre-existing.
- `pnpm` still resolves two copies of `@reactor-team/js-sdk` in the store (2.9.0 cached, 2.9.1 active) — harmless cache residue.
- `@tailwindcss/oxide`, `msw`, `sharp` build scripts were ignored by pnpm — unrelated.

