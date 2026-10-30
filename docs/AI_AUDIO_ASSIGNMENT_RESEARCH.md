# AI-Graded Audio Assignments — Research

**Status:** Research only (no code changes). October 2026.
**Goal from client:** audio assignments are fully handled by AI — no admin has to listen and approve each recording.

---

## 1. The target flow

1. Child opens an audio assignment. A Bunny Stream video plays (media embed, same as today).
2. At set moments the video asks a question, e.g. *"Can you sing?"*
3. The video pauses, the child taps the mic and answers: *"Yes, I can sing."*
4. AI checks the answer, gives instant kid-friendly feedback ("Great job!" / "Let's try again!"), and the video continues.
5. When all prompts are answered, the assignment is completed and stars/badges are awarded automatically.

## 2. What exists today

| Piece | Current state | File |
|---|---|---|
| Assignment model | One assignment = one optional `instructionVideo`, `referenceAudio` or SCORM package. No concept of in-video questions or expected answers. | `backend/models/AudioAssignment.js` |
| Submission | One `recordedAudio` per child per assignment. Status flow `submitted → approved/rejected`. | `backend/models/AudioAssignmentProgress.js` |
| Review | 100% manual: admin lists submissions and approves/rejects; approval awards stars. | `backend/services/audioAssignmentProgress.services.js` (`reviewAudioAssignmentSubmission`) |
| Bunny player | WebView embed, watch-only, child taps "I finished watching". **No player events are listened to** (no pause/timeupdate wiring). | `app/components/child/common/bunny-embed-player-modal.tsx`, `bunny-embed-webview.tsx` |
| Recording | `expo-av` in the app; web upload accepts `audio/webm`, `ogg`, `wav`, `mpeg`. Stored in S3 via `Media`. | `app/package.json`, `backend/middleware/upload.js` |
| AI providers | None integrated yet. | — |

**Takeaway:** the recording + storage + star-award plumbing exists. What's missing is (a) pausing the video at question points, (b) multiple answers per assignment, (c) an automatic grader that replaces the admin decision.

## 3. Pausing the Bunny video at each question — feasible ✅

Bunny Stream's embed supports the **player.js** control API (official, hosted at `https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js`).

- **Methods:** `play`, `pause`, `getPaused`, `getCurrentTime`, `setCurrentTime`, `getDuration`, mute/volume, playback rate.
- **Events:** `ready`, `timeupdate` (payload `{ seconds, duration }`), `play`, `pause`, `ended`, `seeked`, `error`, `progress`.
- No native chapters/cue-points in the player API, so **we store the question timestamps ourselves** and watch `timeupdate`.

How it would work:

```js
const player = new playerjs.Player(iframe);
player.on('ready', () => {
  player.on('timeupdate', ({ seconds }) => {
    const next = prompts.find(p => !p.answered && seconds >= p.atSeconds);
    if (next) { player.pause(); openRecorder(next); } // resume with player.play() after grading
  });
});
```

- **App (React Native):** inject the script into the existing WebView and bridge events with `window.ReactNativeWebView.postMessage` → `onMessage` (the WebView already has an `onMessage` handler). The record button is native UI over the paused video.
- **Web frontend:** same script directly against the iframe; record with `MediaRecorder` (webm/opus).
- `ended` can finally replace the manual "I finished watching" button.
- Block skipping: on `seeked` past an unanswered prompt, seek back to it (controls are already hidden in watch-only mode).

**Content authoring:** admins add a list of prompts per assignment in the CMS — timestamp, question, expected answer(s). This is a small data-model change (see §7).

## 4. Grading the child's answer — options

Answers are short (2–6 s), and in the example the **expected answer is known in advance** ("Yes, I can sing"). That matters a lot: we are checking "did the child say this sentence", not "transcribe anything a child says", which is the harder problem.

### Option A — Pronunciation assessment against the expected sentence (recommended primary)
**Azure AI Speech – Pronunciation Assessment, scripted mode.** Send the audio plus the reference text `"Yes, I can sing"`. Returns:
- `CompletenessScore` — ratio of expected words actually said
- `AccuracyScore` — how close pronunciation is (phoneme/word/sentence level)
- `FluencyScore`, optional `ProsodyScore` (en-US only)
- Per-word `ErrorType`: `Omission`, `Insertion`, `Mispronunciation` (word accuracy < 60) — with `EnableMiscue: true`

Clips under 30 s use the simple single-shot mode (ours always will). Available over REST and the JS/Node SDK, so it can run in our backend.

- ✅ Built exactly for "read/repeat this sentence" language learning
- ✅ Gives word-level detail → can say *"You forgot 'sing'!"*
- ⚠️ Scores are calibrated to adult native speech; children will score lower → thresholds must be lenient and tuned on real recordings
- 💲 Billed at the standard speech-to-text rate (~$1/audio-hour real-time per community/Microsoft Q&A; prosody is a paid add-on). **Confirm exact rate on the Azure pricing calculator for our region.**

### Option B — Speech-to-text + smart text comparison (recommended fallback / open answers)
Transcribe with **OpenAI Whisper / gpt-4o-transcribe** (~$0.006/min; mini ~$0.003/min) or **Deepgram**, then compare to the expected answer:
- simple: normalized fuzzy match ("yes i can sing" vs "yes I can sing!")
- smarter: an LLM (e.g. Claude) judges "is this an acceptable answer to *Can you sing?*" — accepts "Yes I can!" or "I can sing" without listing every variant.

- ✅ Handles open-ended questions ("What's your favorite color?") where no single answer exists
- ✅ Whisper is currently the most accurate general model on child speech in published benchmarks
- ⚠️ Transcribers "auto-correct" toward fluent English, so it can't really judge pronunciation
- ⚠️ Child speech is still hard: one 2024 study (4–5 year olds) measured word error rate of **21% Whisper, 30% Azure, 49% Google**. Exact-transcript matching would wrongly fail many kids — leniency is required.

### Option C — Child-specialized speech vendor
**SoapBox Labs** built speech recognition specifically for ages 4–12, with pronunciation/fluency scoring and COPPA Safe Harbor (PRIVO) certification. Strongest on child-voice accuracy and compliance posture, but pricing is not public and current commercial availability needs a sales conversation. Worth one inquiry before committing.

### Recommendation
**Hybrid:** Azure scripted pronunciation assessment as the main grader (we always know the expected sentence), with an STT + LLM check as a second opinion for borderline results and for any open-ended prompts. Run a short pilot (§9) before fixing the vendor — the decision should be driven by how each performs on *our* kids' recordings, not by benchmarks.

## 5. Decision policy (what "AI handles it completely" means)

For young children, the grader's job is encouragement, not strict testing. Suggested logic per prompt:

| Result | Action |
|---|---|
| Silence / no speech detected | "I didn't hear you — tap and try again!" (doesn't count as an attempt) |
| Completeness ≥ ~70% and accuracy ≥ ~50% *(placeholder thresholds, tune in pilot)* | ✅ Pass, celebrate, resume video |
| Below threshold, attempts < 3 | Friendly retry, optionally replay the model answer from the video |
| Still below after 3 attempts | Pass with "effort" (child keeps moving) and flag for optional admin spot-check |

- Assignment auto-completes when all prompts pass → existing star/badge award path runs (same as admin "approved" today).
- Keep the admin review screen as an **audit/spot-check** tool, not a gate. During the pilot, run AI in "shadow mode" (AI scores, admin still decides) to measure agreement.
- Never show a child a numeric score or the word "wrong".

## 6. Latency — real time is achievable
A 3–5 s clip uploaded to the backend and graded by Azure/Whisper should return in roughly 1–3 s. That's fast enough to grade **synchronously** while the video is paused, with a short "listening…" animation. Fallback on timeout: accept the answer, grade asynchronously, and let the result feed the spot-check queue.

## 7. Required changes (for later estimation, not now)

**Data model**
- `AudioAssignment.prompts[]`: `{ atSeconds, question, expectedAnswers[], mode: 'repeat' | 'open', maxRecordSeconds }`
- `AudioAssignmentProgress.responses[]`: `{ promptId, media, attempts, transcript, scores, aiDecision, gradedAt, provider }`
- New status/flag for `ai_approved` vs `admin_approved` (keeps reporting honest)

**Backend**
- Grading service with a provider interface (Azure / OpenAI / Deepgram swappable)
- Endpoint: upload one prompt answer → returns pass/retry + feedback
- Completion hook reusing the existing approve → stars/badges logic

**App + web**
- player.js bridge in the Bunny WebView/iframe, prompt overlay, recorder per prompt, retry UX

**CMS**
- Prompt editor on the assignment form (timestamp picker while previewing the video)

## 8. Privacy & compliance (must be solved before launch)

A child's voice recording is personal information under COPPA (and LGPD).
- **The COPPA "voice audio" exception does not apply** — it only covers audio used solely to respond to the child and **deleted immediately**. We store recordings and grade them, so we rely on verifiable parental consent (which recording already requires today).
- **Sending audio to an AI vendor is a new third-party disclosure.** Needs: a DPA with the vendor, no use of data for model training, documented retention, and an update to `docs/CHILD_DATA_PRIVACY.md` ("Third-party sharing" currently lists only AWS) and the public privacy policy.
- **OpenAI:** their official under-18 guidance says not to process personal data of children under 13 **without zero data retention (ZDR)** enabled — ZDR requires approval from OpenAI. This is a blocker to resolve before using OpenAI for audio.
- **Azure:** verify the data-handling terms for real-time speech (whether audio is logged/retained) and make sure logging is off.
- Consider deleting raw audio after grading + a short audit window, and keeping only scores/transcript.
- Amended COPPA Rule compliance date was April 22, 2026 — already in force.
- Also cross-check against `docs/COPPA_LGPD_GAP_CHECKLIST.md`.

## 9. Proposed next step — a 1–2 week pilot / spike

1. Pick 2–3 real assignments, define prompts + expected answers.
2. Collect 50–100 consented recordings (or reuse existing approved/rejected submissions if the consent covers it).
3. Run each through Azure scripted assessment and Whisper + LLM judge.
4. Compare against admin decisions → agreement rate, false-reject rate, latency, cost per assignment.
5. Pick provider + thresholds, then estimate the build (§7).

## 10. Rough cost estimate (to validate in pilot)

Assume ~1 min of graded audio per assignment (5 prompts × ~5 s, plus retries).

| Volume | Azure (~$1/hr) | Whisper (~$0.006/min) |
|---|---|---|
| 1,000 children × 20 assignments/month = 20,000 min | ~$330/month | ~$120/month |
| + LLM judge on borderline only | small (short text calls) | small |

Prices are indicative from public/community sources — confirm with each vendor.

## 11. Questions for the client

1. **Age range and native language** of the children? (Non-native child speech is the hardest case for all vendors.)
2. Is the goal **pronunciation quality** or **participation** ("did they say it")? This sets how strict the grader is.
3. Are answers always a fixed sentence ("Yes, I can sing") or sometimes open ("What do you like?")?
4. Should a human ever see/hear recordings after AI goes live (spot-check), or none at all?
5. Should parents be able to hear their child's answers?
6. Max retries before we let the child move on?
7. Web and app both, or app first?
8. Any preference/existing account with Microsoft Azure or OpenAI?

---

### Sources
- Bunny Stream Playback control API (player.js): https://docs.bunny.net/stream/playback-api — https://bunny.net/blog/introducing-player-js-support-for-bunny-stream-advanced-player-control-and-monitoring-api
- Azure Pronunciation Assessment how-to: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- Azure Pronunciation Assessment pricing notes: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool — https://azure.microsoft.com/en-us/pricing/details/speech/ — https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat
- Child speech recognition benchmark (Whisper/Azure/Google): https://arxiv.org/abs/2404.17394
- Non-native child speech ASR: https://arxiv.org/pdf/2306.16710
- SoapBox Labs: https://www.speechtechmag.com/Articles/News/Speech-Technology-News/SoapBox-API-Lets-Kids-Have-a-Voice-122428.aspx — https://docs.soapboxlabs.com/resources/privacy-policy
- OpenAI under-18 API guidance: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
- OpenAI transcription pricing (aggregator): https://costgoat.com/pricing/openai-transcription
- Amended COPPA Rule (2025): https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments — https://www.wiley.law/alert-FTC-Adopts-Amended-Childrens-Online-Protection-Act-Rule
