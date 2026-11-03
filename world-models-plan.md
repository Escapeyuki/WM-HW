# World Models: Available Tools and Plans

Written 2026-11-02. Due: 2026-11-03.

**Goal:** Build and compare an explorable world and a playable world using AI world models. The point is to try the tools, see where they fail, and see what is good.

**Hardware:** NVIDIA RTX 4080 Super PC (assumed Windows or Linux) and a Mac.

## Available tools (no waitlist, no early access)

| Tool | What it gives you | Cost | Where it runs |
|---|---|---|---|
| **Marble** (World Labs), `marble.worldlabs.ai` | Explorable 3D world from text, one image, several images, or a 360 panorama | Free plan: 7,000 credits, up to 4 world generations | Browser (Mac or PC) |
| **Overworld Waypoint**, Biome app from `over.world/install` | Playable world model, real time | Free, open source (MIT) | 4080 Super PC. Needs an RTX 3070-class card or better. macOS client is "coming soon." |
| **Overworld Stream**, `overworld.stream` | Same Waypoint models, streamed | Free, sign-in required (Discord, GitHub, Google, passkey or email) | Browser (Mac or PC) |

Notes:
- **Marble free plan has no export.** Splat export, low-resolution collider meshes and Draft mode start at Standard ($20/mo). High-resolution textured meshes and commercial rights start at Pro ($35/mo).
- **Marble credits:** a basic world is about 1,580 credits (1,500 generation plus 80 for the input). Seven thousand credits covers 4 worlds with about 680 left over. Expanding a world costs 2,000 more, so skip it on the free plan.
- **Overworld:** use `over.world` only. `overworld.ai` is a parked domain for sale, so do not download anything from there.
- **Checked in Chrome, signed in, 2026-11-02:** Overworld Stream has 19 public worlds plus a "Make World" box (press M) that takes a text prompt. An image upload was not visible. Marble's model menu lists Marble 1.1 Plus, 1.1, 1.0 (legacy) and 1.0 Draft, but Draft is locked behind the $20 Standard plan. Stay on Marble 1.1 (1,500 credits). 1.1 Plus costs 1,500–3,000, which could break the budget.

### Optional backup (not tested)
- **Tencent HY-World 2.0** hosted try: `3d.hunyuan.tencent.com/sceneTo3D`. Text, image or video in, mesh or Gaussian splat out. The license excludes the EU, UK and South Korea. Running it locally needs CUDA, and VRAM needs for a 16 GB card are unknown.

### Not using for tomorrow
| Tool | Why not |
|---|---|
| Google Project Genie (Genie 3) | Google AI Ultra only, reportedly $100–200/mo. Sources conflict on the price. |
| Google Genie 4 | Research preview for trusted testers only. |
| Runway GWM-1 | Early access by application. |
| Matrix-Game 4.0 | Linux and NVIDIA only. Seen in one blog post. |
| Decart (Oasis 3, Lucy) | Real-time video-to-video, not an explorable world. Pay-as-you-go, so it's a possible side trip. |

## Plans

### Plan 1 (recommended): Explorable vs playable
Make the same kind of place in Marble and in Waypoint, then compare them.

Tests to run on both:
1. **Turn-around:** does the space look the same after you spin around?
2. **Walk-away-and-return:** does it match when you come back?
3. **Doorway:** can you go through a door or opening?

Evidence: a screen recording per tool and one short note per test.

Cost: free.

### Plan 2: A Marble tour
Generate three different worlds: a real place from a photo, an invented place from text, and something odd. Record one walkthrough. This feeds Plan 1.

### Plan 3: Failure gallery
Give both tools things they are likely to struggle with: mirrors, text on signs, stairs, water, crowds. Capture what breaks. Can be folded into Plan 1.

### Plan 4 (bonus, only if time allows): Walkable level
Pay for one Standard month ($20) to export a splat and a low-resolution collider mesh. Build a small three.js page with a first-person controller. Riskier because of the time limit and unknown collision quality.

## Credit budget (Marble free plan)
| Use | Credits |
|---|---|
| 4 basic worlds (image or text input) | about 6,320 |
| Left over | about 680 |

Decide all four worlds before generating any.

## Schedule for tonight
| Time | Task |
|---|---|
| First 30 min | Create the Marble and Overworld accounts. Install Biome on the 4080 PC. Check both launch. |
| Next 2 hours | Generate the Marble worlds and play Waypoint. Record as you go. |
| Last 2 hours | Run the tests, write up what worked and what failed. Start Plan 4 only if ahead. |

Recording: Shift-Cmd-5 on Mac. OBS or Xbox Game Bar on the PC.

## Results log

| Test | Marble | Waypoint |
|---|---|---|
| Turn-around | | |
| Walk-away-and-return | | |
| Doorway | | |
| Failures spotted | | |
| Would use again? | | |

## Verification status
- **Checked directly on 2026-11-02:** Marble free-plan contents (pricing page), Marble credit costs, Biome platform support and GPU guidance (`over.world/install`), Overworld Stream landing page and sign-in requirement, the Biome 1.1.1 Windows installer (offered, about 124.5 MB, not downloaded), the Marble account (Free, 7,000 credits) and the Waypoint world list.
- **From secondary sources (check before relying on them):** Genie pricing, Matrix-Game 4.0, HY-World 1.5.
- **Not checked:** whether Waypoint accepts an image as a starting scene, how well Biome runs on the 4080 Super, the HY-World hosted demo.

## Links
- Marble pricing: https://marble.worldlabs.ai/pricing
- Marble API pricing: https://docs.worldlabs.ai/api/pricing.md
- Biome download: https://over.world/install
- Overworld Stream: https://www.overworld.stream/
- HY-World 2.0: https://github.com/Tencent-Hunyuan/HY-World-2.0
