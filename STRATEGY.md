# Product Strategy Analysis: Unified Claude Code Desktop Companion

**Date:** 2026-03-29
**Author:** Andrew Zellinger & Bumba (Strategy Chief)
**Status:** Strategic analysis — feeds into PRD

---

## 1. Target User Persona

### Primary: The Power Builder

**Who they are:** Professional developers and design engineers running Claude Code CLI daily on macOS. They have 2-5 concurrent sessions, use tmux or multiple terminal tabs, and treat Claude Code as a core part of their workflow — not a novelty.

**Demographics:**
- macOS users (MacBook Pro with notch, or external display setups)
- Running Claude Code Pro/Team/Enterprise subscriptions
- Mid-to-senior engineers, technical leads, solo founders, design engineers
- Heavy terminal users who also value visual feedback

**Pain points they live with today:**
1. **Context switching tax.** Permission approval requires switching to the terminal, finding the right tab, reading the tool call, pressing Y/N. Every switch costs 15-30 seconds and breaks flow.
2. **Session blindness.** Running 3+ Claude sessions simultaneously means constantly checking "is it done? is it stuck? does it need me?" No ambient awareness.
3. **Lost history.** Terminal scrollback is ephemeral. Claude Code's conversation files exist but are not browsable. Finding "that thing Claude did 3 hours ago" is archaeology.
4. **Voice is missing.** Dictating complex prompts is faster than typing them for many tasks. The CLI is text-only.
5. **No marketplace discovery.** Installing skills and plugins requires manual GitHub browsing and file manipulation.

**What they would pay for:** An ambient companion that watches their sessions and only demands attention when something needs a decision. Think "air traffic control" for Claude Code.

### Secondary: The Visual Learner

Newer Claude Code users who adopted it but feel more comfortable with a GUI. They want the power of the CLI without living in the terminal. They use Claude Code but wish it felt more like a polished product and less like a raw pipe.

### Anti-persona: The VS Code Loyalist

Developers who interact with Claude exclusively through VS Code's integrated terminal or Copilot-style extensions. They do not want another application window. This product should not try to convert them — it competes on a different axis entirely (ambient awareness, not IDE integration).

---

## 2. Competitive Landscape

### Direct Competitors (Claude Code GUI wrappers)

| Product | Approach | Strengths | Weaknesses |
|---------|----------|-----------|------------|
| **Claude Island** (farouqaldori) | Native Swift/SwiftUI, notch overlay | Beautiful notch UX, low resource usage, permission approval via hooks | Monitor-only — cannot drive sessions, no voice, no marketplace, limited to notch-aware Macs |
| **Clui CC** (lcoutodemos) | Electron overlay, spawns own processes | Full session management, voice via Whisper, marketplace, multi-tab | Electron overhead (~150MB RAM per window), not notch-native, spawns separate processes instead of monitoring existing ones |
| **Claude Desktop** (Anthropic) | Official Electron app | Official, API-direct, MCP support | Not a CLI companion — it is its own chat interface. Cannot monitor terminal sessions. Different product category entirely. |
| **Cursor / Windsurf** | IDE with AI integration | Deep code context, integrated into editor | Not Claude Code specific, IDE-locked, cannot monitor background sessions |
| **VS Code Claude Extension** | Editor extension | Lives where devs already work | Limited to VS Code, no ambient monitoring, no multi-session awareness |

### Indirect Competitors

| Product | Relevance |
|---------|-----------|
| **Raycast AI** | Quick AI access from anywhere on macOS, but no session management |
| **CleanShot X notch feature** | Proved the notch as interaction real estate on macOS |
| **Bartender / iStatMenus** | Menu bar utilities — similar "ambient awareness" UX pattern |

### Differentiation Summary

No existing product combines: (a) native macOS notch integration, (b) ability to both monitor AND drive Claude Code sessions, (c) voice input, (d) skills marketplace, and (e) ambient permission approval. The combined product would be the first to occupy this specific intersection.

The key insight: Claude Island proved the notch UX is compelling but is limited to monitoring. Clui CC proved that a full session driver is valuable but uses Electron (heavy, non-native). Combining them into a native Swift app that does both is a genuinely novel product.

---

## 3. Value Proposition

### One-liner

**Your MacBook's notch becomes a command center for Claude Code — monitor sessions, approve tools, drive conversations, and use voice, all without leaving your flow.**

### Expanded

A native macOS app that lives in your MacBook's notch area, providing ambient awareness of all running Claude Code sessions. It expands on hover or tap to show session status, approve tool permissions, browse conversation history, start new sessions, and input via voice — collapsing back to the notch when you are done. It is the always-on co-pilot dashboard that Claude Code's terminal interface cannot be.

### Why now

1. Claude Code adoption is accelerating — Claude Code CLI has moved from early adopter to mainstream professional tool.
2. MacBook notch real estate is proven but underutilized — only a handful of apps use it meaningfully.
3. Anthropic's hook system (`~/.claude/hooks/`) has stabilized, providing a reliable integration surface.
4. The two open-source projects have independently validated the two halves of this product.

---

## 4. Feature Prioritization (RICE Framework)

Assumptions for RICE scoring:
- **Reach**: Estimated users per quarter who would encounter this feature (scale: the total addressable user base of Claude Code power users on macOS, estimated at ~200K by Q4 2026)
- **Impact**: 3 = Massive, 2 = High, 1 = Medium, 0.5 = Low, 0.25 = Minimal
- **Confidence**: 100% = High, 80% = Medium, 50% = Low
- **Effort**: Person-months

### P0 — Must Ship (RICE > 15)

| # | Feature | Reach | Impact | Confidence | Effort | RICE | Source | Rationale |
|---|---------|-------|--------|------------|--------|------|--------|-----------|
| 1 | **Notch overlay with session status** | 200K | 3 (Massive) | 100% | 2 | **300** | Island | The core identity of the product. Without this, there is no product. |
| 2 | **Permission approval from notch** | 200K | 3 (Massive) | 100% | 1.5 | **400** | Both | The #1 pain point for Claude Code users. This alone justifies the app. |
| 3 | **Multi-session monitoring** | 180K | 2 (High) | 100% | 1 | **360** | Island | Most power users run 2+ sessions. Showing all sessions is table stakes. |
| 4 | **Hook-based communication** (Unix socket) | 200K | 2 (High) | 100% | 1 | **400** | Island | The technical foundation. Using hooks (not process spawning) means monitoring existing sessions without overhead. |
| 5 | **Expand to full panel** (chat view) | 160K | 2 (High) | 80% | 2 | **128** | Both | Users need to see conversation context to make permission decisions. |
| 6 | **Start/resume sessions** | 140K | 2 (High) | 80% | 3 | **75** | Clui | Transforms from monitor-only to a full companion. Critical for the value prop. |

### P1 — High Value (RICE 5-15)

| # | Feature | Reach | Impact | Confidence | Effort | RICE | Source | Rationale |
|---|---------|-------|--------|------------|--------|------|--------|-----------|
| 7 | **Voice input** (Whisper local STT) | 100K | 2 (High) | 80% | 2 | **80** | Clui | Differentiator. Voice-to-prompt is faster for complex instructions. |
| 8 | **Conversation history browser** | 120K | 1 (Medium) | 80% | 2 | **48** | Both | Browsing past sessions without terminal archaeology. |
| 9 | **Dark/light theme** with system follow | 200K | 0.5 (Low) | 100% | 0.5 | **200** | Clui | Quality-of-life, but the notch is always dark so the urgency is lower for closed state. |
| 10 | **Markdown rendering** in chat | 160K | 1 (Medium) | 100% | 1 | **160** | Both | Code blocks, formatting — essential for readability in expanded view. |
| 11 | **File/screenshot attachments** | 80K | 1 (Medium) | 50% | 2 | **20** | Clui | Useful for sharing visual context with Claude. Moderate reach. |
| 12 | **Notification sounds** with session awareness | 150K | 0.5 (Low) | 100% | 0.5 | **150** | Island | Ambient awareness without looking. Already implemented in Island. |

### P2 — Nice to Have (RICE 1-5)

| # | Feature | Reach | Impact | Confidence | Effort | RICE | Source | Rationale |
|---|---------|-------|--------|------------|--------|------|--------|-----------|
| 13 | **Skills marketplace** | 60K | 1 (Medium) | 50% | 3 | **10** | Clui | Valuable but dependent on Anthropic's plugin ecosystem growing. |
| 14 | **Slash command support** | 80K | 0.5 (Low) | 50% | 1.5 | **13** | Clui | Convenience, but most users type these in terminal. |
| 15 | **Model picker** per session | 60K | 0.5 (Low) | 50% | 1 | **15** | Clui | Nice shortcut but rarely changed mid-session. |
| 16 | **Click-through transparent mode** | 40K | 0.5 (Low) | 80% | 1 | **16** | Clui | For users who want the overlay visible but non-blocking. |
| 17 | **Auto-update** (Sparkle) | 200K | 0.25 (Minimal) | 100% | 1 | **50** | Island | Important for distribution but not a user feature. |

### P3 — Future / Post-Launch

| # | Feature | Reach | Impact | Confidence | Effort | RICE | Source | Rationale |
|---|---------|-------|--------|------------|--------|------|--------|-----------|
| 18 | **Global hotkey toggle** | 200K | 0.25 | 80% | 0.5 | **80** | Clui | Quick access without mouse. |
| 19 | **MCP server browsing** | 40K | 0.5 | 50% | 2 | **5** | New | Inspect active MCP connections per session. |
| 20 | **Session cost tracking** | 80K | 0.5 | 50% | 1.5 | **13** | New | Show token usage and cost per session. |
| 21 | **Tmux integration** (focus, send keys) | 40K | 1 | 50% | 2 | **10** | Island | Deep tmux integration for power users. |
| 22 | **External display support** (no physical notch) | 60K | 1 | 80% | 1 | **48** | Island | Already handled in Claude Island — floating notch on non-notched displays. |

---

## 5. Risk Analysis

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Anthropic changes hook system** | Critical | Medium | The hook system (`~/.claude/hooks/`) is now documented and part of the public API. But it could change between major CLI versions. Mitigation: version-pin hook compatibility, maintain an adapter layer, monitor Claude Code changelogs. |
| **Anthropic ships their own notch app** | Critical | Low | They have Claude Desktop but it serves a different purpose (API chat, not CLI companion). If they ship a CLI companion, it validates the category but kills the product. Mitigation: move fast, build community, differentiate on features they would not build (marketplace, tmux integration, voice). |
| **Swift/SwiftUI limitations for complex UI** | High | Medium | The expanded panel (chat view, marketplace) requires substantial UI that SwiftUI handles well for standard views but can struggle with rich markdown rendering and virtualized scrolling. Mitigation: use AppKit interop (`NSViewRepresentable`) for the heavy views. Claude Island already demonstrates this is tractable. |
| **Process spawning reliability** | High | Medium | Spawning `claude -p` from a macOS app involves managing child processes, environment variables, PATH resolution, and credential inheritance. Clui CC solved this in Node.js but it needs re-implementation in Swift. Mitigation: reuse Clui CC's process management patterns, build a robust `ProcessExecutor` (Claude Island already has one). |
| **Unix socket permission issues** | Medium | Low | The socket at `/tmp/claude-island.sock` needs correct permissions for hooks to write to it. Already solved in Claude Island. |
| **macOS sandboxing vs app functionality** | Medium | Medium | Mac App Store requires sandboxing which conflicts with spawning arbitrary CLI processes and writing to `~/.claude/hooks/`. Mitigation: distribute outside App Store initially (GitHub releases + Homebrew). |

### Market Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Claude Code adoption plateaus** | High | Low | Anthropic is investing heavily in Claude Code. The trajectory is upward. But if a competing AI coding tool captures the market, the TAM shrinks. Mitigation: the architecture could adapt to other CLI AI tools (Codex, Gemini CLI). |
| **"Good enough" with terminal** | Medium | High | Many users will find the terminal "good enough" and never install a companion app. The product must deliver an experience that is *obviously* better within 30 seconds of first use. The permission approval flow is the hook — it is the one pain point that is universally annoying. |
| **Open source clones** | Medium | Medium | If this product is open source, forks are expected and healthy. If proprietary, open-source alternatives will emerge. Mitigation: build community, ship fast, maintain quality. |

### Dependency Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Claude Code CLI breaking changes** | High | High | CLI output format (`stream-json`), hook API, and session file structure can change with any update. Mitigation: adapter pattern for CLI version compatibility, automated integration tests against CLI versions. |
| **Whisper/WhisperKit API changes** | Low | Low | Voice is an optional feature. If the underlying STT tool changes, fallback to another local engine. |
| **macOS version requirements** | Medium | Low | Targeting macOS 15+ limits some users. Claude Island requires 15.6+. Mitigation: consider 14+ support for broader reach if feasible. |

---

## 6. Naming and Positioning

### Name Analysis

| Candidate | Pros | Cons |
|-----------|------|------|
| **Notch** | Instantly communicates the core UX. Short, memorable | Too generic. Other notch apps exist. Trademark conflicts likely. |
| **Claude Notch** | Clear association with Claude + notch | "Claude" in the name may imply official Anthropic product. Could cause confusion or trademark issues. |
| **Sentry** | Communicates "watching over your sessions" | Already a well-known error tracking product. |
| **Vigil** | "Keeping watch" — the ambient monitoring metaphor | Not immediately obvious what it does. |
| **Cove** | A sheltered place (the notch as a cove). Short, distinctive | May feel too abstract. |
| **Crab** | Claude's mascot is a crab. Already used in Claude Island's icon | Fun, memorable. But might feel unserious. |
| **Helm** | "At the helm" — control center metaphor | Clean, professional. "Helm" has some namespace conflicts (Kubernetes). |
| **Isle** | Short for Island. The notch as a tiny island | Could be confused with Claude Island itself. |
| **Watch** | Ambient monitoring metaphor | Too generic. Apple Watch associations. |
| **Crow's Nest** | Lookout point on a ship — watching all sessions from above | Too long, but the metaphor is strong. |
| **Perch** | Where a bird watches from. The notch is a perch | Short, distinctive, available. Communicates the ambient watching behavior. |

### Recommendation: **Perch**

Rationale:
- Short, memorable, distinctive
- The metaphor is precise: the app perches in your notch and watches your sessions
- No major namespace conflicts in the developer tools space
- Works as both noun and verb ("Perch watches your Claude sessions" / "Perch it in your notch")
- Does not include "Claude" in the name, avoiding Anthropic trademark issues while staying associated through positioning
- The icon could be a bird silhouette on a notch-shaped perch, or the Claude crab perched on the notch

### Positioning Statement

**For** macOS developers who run Claude Code daily, **Perch is** a native desktop companion **that** lives in your MacBook's notch, providing ambient session monitoring, instant permission approval, voice input, and full session management **unlike** working directly in the terminal, which requires constant context switching between tabs and windows to manage concurrent AI coding sessions.

---

## 7. Distribution Strategy

### Phase 1: Developer Distribution (Launch)

| Channel | Priority | Rationale |
|---------|----------|-----------|
| **GitHub Releases** | Primary | Standard for developer tools. `.dmg` with signed binary. Star count = social proof. |
| **Homebrew Cask** | Primary | `brew install --cask perch` is the expected install path for macOS dev tools. |
| **Direct download** (website) | Secondary | Landing page with demo video, download button. Captures email for updates. |

### Phase 2: Wider Distribution (Post-traction)

| Channel | Priority | Rationale |
|---------|----------|-----------|
| **Mac App Store** | Evaluate | Sandbox requirements may conflict with core functionality. Only pursue if sandboxing is feasible without losing features. |
| **Setapp** | Consider | Discovery channel for macOS utilities. Revenue share model. |

### Why NOT Mac App Store at launch

The app needs to:
1. Spawn `claude` CLI subprocesses (sandbox violation)
2. Write hook scripts to `~/.claude/hooks/` (sandbox violation)
3. Create a Unix socket at `/tmp/` (sandbox violation)
4. Access microphone for voice input (possible with entitlement)
5. Read arbitrary file paths that Claude references (sandbox violation)

Mac App Store sandboxing makes this nearly impossible without crippling the product. GitHub + Homebrew is the right first move.

### Code Signing

Must be signed with an Apple Developer ID certificate and notarized to avoid macOS Gatekeeper warnings. Budget $99/year for Apple Developer Program membership. This is non-negotiable for distribution outside the App Store.

---

## 8. Success Metrics

### North Star Metric

**Daily Active Notch Interactions** — the number of times per day a user interacts with Perch (expand, approve permission, start session, use voice input). Target: 10+ interactions/day/user within 30 days of install.

### Launch Metrics (First 90 Days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| GitHub stars | 2,000 | GitHub API |
| Unique installs | 5,000 | Download count (GitHub releases + Homebrew analytics) |
| DAU (Daily Active Users) | 1,000 | Optional opt-in analytics (Mixpanel or PostHog, disabled by default) |
| Retention (D7) | 40% | Of users who install, what % are still using after 7 days |
| Retention (D30) | 25% | 30-day retention |
| Permission approvals via notch | 50% | Of all permission events, what % are approved through Perch vs terminal |
| Average sessions monitored | 2+ | Sessions per user per day |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Crash rate | < 0.1% | Crash reporting (Sentry or built-in) |
| Memory usage | < 80MB resident | Activity Monitor / automated tests |
| CPU idle | < 0.5% | When no sessions active |
| Permission response latency | < 200ms | Time from user tap to CLI receiving response |
| Cold launch to monitoring | < 2s | App launch to first session detected |

### Community Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Contributors | 10+ in first 6 months | GitHub contributor count |
| Issues filed | 100+ | GitHub issues (signal of engagement) |
| Forks | 200+ | GitHub forks |
| Discord/community members | 500+ | Community platform metrics |

---

## 9. Phasing Strategy

### Phase 0: Foundation (Weeks 1-2)

**Goal:** Get the native Swift project scaffolded with the notch overlay rendering correctly. Validate that the combined architecture is feasible.

**Deliverables:**
- New Xcode project with SwiftUI lifecycle
- Notch geometry detection and overlay rendering (port from Claude Island)
- Window management (above all windows, click-through when collapsed)
- Hook installer (auto-setup `~/.claude/hooks/`)
- Unix socket server for hook communication
- Basic session detection and status display in closed notch state

**Validation:** The notch expands and shows "2 Claude sessions running" when Claude Code is active in a terminal.

### Phase 1: Permission Flow (Weeks 3-4)

**Goal:** Ship the single most valuable feature — permission approval from the notch.

**Deliverables:**
- Permission request detection via hooks
- Expand notch to show tool name, input preview, approve/deny buttons
- Response routing back to the correct session via socket
- Notification sound when permission is needed
- Auto-deny timeout (5 minutes)
- Boot animation and idle-state visibility logic

**Validation:** User can approve a `Bash` tool call from the notch without switching to the terminal. This is the MVP release.

**Ship as:** v0.1.0 — "Monitor + Approve" beta release on GitHub.

### Phase 2: Full Companion (Weeks 5-8)

**Goal:** Transform from monitor to companion. Add session driving and conversation viewing.

**Deliverables:**
- Expanded panel with full conversation view (markdown rendering)
- Start new Claude Code session from the notch
- Resume existing sessions
- Multi-tab session management
- Chat history browser (read from Claude Code's session files)
- Process spawning via `claude -p --output-format stream-json`
- NDJSON stream parsing and event normalization

**Validation:** User can start a new Claude Code session, type a prompt, see the response, and approve permissions — all without opening a terminal.

**Ship as:** v0.2.0 — "Full Companion" beta.

### Phase 3: Voice and Polish (Weeks 9-12)

**Goal:** Add voice input and polish the experience to release quality.

**Deliverables:**
- Voice input via WhisperKit (Apple Silicon) or whisper-cpp (Intel fallback)
- Push-to-talk from expanded panel
- File/screenshot attachment support
- Dark/light theme with system follow
- Keyboard shortcuts (global hotkey to toggle)
- Auto-update via Sparkle framework
- Homebrew Cask formula
- Landing page with demo video

**Validation:** User can dictate a complex prompt via voice, see it transcribed, watch Claude work, approve tools from the notch, and share a screenshot attachment — all from Perch.

**Ship as:** v1.0.0 — public release.

### Phase 4: Ecosystem (Weeks 13+)

**Goal:** Build the ecosystem features that drive long-term retention.

**Deliverables:**
- Skills marketplace (browse, install, manage)
- Slash command support from input bar
- Session cost tracking
- MCP server status viewer
- Tmux deep integration (focus pane, send keys)
- External display support (floating notch for non-notched screens)
- Community plugin system

---

## 10. Open Source Strategy

### License Recommendation: MIT

**Rationale:**
- Claude Island uses Apache 2.0, Clui CC uses MIT. Both are permissive.
- MIT is the most common license for macOS developer tools and minimizes friction for contributors
- No patent grant concerns (unlike Apache 2.0) for a UI-focused app
- Maximizes adoption and community contribution

### Repository Structure

```
perch/
  README.md
  LICENSE (MIT)
  CONTRIBUTING.md
  SECURITY.md
  CODE_OF_CONDUCT.md
  Perch/                    # Xcode project source
    App/
    Core/
    Models/
    Services/
      Hooks/                # Socket server, hook installer
      Session/              # Session monitoring, process spawning
      Voice/                # WhisperKit/whisper-cpp integration
      Marketplace/          # Skills browser
    UI/
      Components/
      Views/
      Window/
  Perch.xcodeproj/
  scripts/
    install-hooks.sh
    build.sh
  docs/
    ARCHITECTURE.md
    DEVELOPMENT.md
```

### Community Model

**Phase 1 (0-6 months): Benevolent dictator.**
Andrew and Bumba review all PRs. Quality bar is high. Establish the codebase patterns and architectural decisions before opening the floodgates.

**Phase 2 (6-12 months): Core maintainer team.**
Identify 2-3 active contributors and grant commit access. Establish RFC process for major features.

**Phase 3 (12+ months): Open governance.**
If the project has meaningful traction, formalize governance with a MAINTAINERS file and decision-making process.

### Contribution Guidelines

- All contributions must be in Swift (no Electron, no web views for core UI)
- SwiftUI preferred, AppKit interop when SwiftUI cannot deliver the UX
- No analytics or telemetry in the default build (opt-in only)
- All PRs require tests for new functionality
- Design decisions documented in ADRs (Architecture Decision Records)

### Attribution

Both Claude Island and Clui CC should be credited in the README:

> Perch builds on ideas pioneered by [Claude Island](https://github.com/farouqaldori/claude-island) (notch overlay for Claude Code monitoring) and [Clui CC](https://github.com/lcoutodemos/clui-cc) (full-featured Claude Code desktop companion). We are grateful to both projects for proving that a better desktop experience for Claude Code is possible.

### What to Port vs Rewrite

| Component | Source | Approach |
|-----------|--------|----------|
| Notch geometry, overlay, window management | Claude Island | Port directly — Swift/SwiftUI, well-architected |
| Hook socket server | Claude Island | Port directly — already in Swift, battle-tested |
| Session monitoring and state management | Claude Island | Port directly — clean `SessionStore` + `SessionState` pattern |
| Permission flow (UI + routing) | Claude Island | Port directly — the full flow is implemented and working |
| Process spawning (`claude -p`) | Clui CC | Rewrite in Swift — port the patterns (ControlPlane, RunManager, EventNormalizer) but implement natively |
| NDJSON stream parsing | Clui CC | Rewrite in Swift — straightforward line-by-line JSON parsing |
| Event normalization | Clui CC | Port the event mapping table, implement in Swift |
| Conversation view (markdown) | Both | Rewrite — use swift-markdown or a WebKit-backed view for rich rendering |
| Voice input | Clui CC | Rewrite — WhisperKit has a native Swift API, much cleaner than the Electron approach |
| Marketplace | Clui CC | Rewrite — fetch GitHub catalogs, render natively in SwiftUI |
| Theme system | Clui CC | Rewrite — SwiftUI has native dark/light support |

---

## Strategic Recommendation

Build it. The opportunity is clear, the technical risk is manageable, and the two source projects have de-risked the hardest parts independently.

The critical strategic decision is **native Swift vs Electron**. Native Swift is the right call for three reasons:
1. The notch overlay is the product's identity, and Claude Island proves it works beautifully in SwiftUI
2. Resource efficiency matters for an always-on app — 30MB vs 150MB+ for Electron
3. macOS-only is the right scope. Cross-platform ambitions would dilute the UX that makes this product distinctive

The launch sequence matters: ship the permission approval flow first (Phase 1). It is the single feature that delivers the most value with the least effort, and it creates an immediate "I can't go back" moment for users. Everything else layers on top.

The name **Perch** captures the product's essence. The open-source strategy under MIT license maximizes community growth. And the distribution through GitHub releases + Homebrew is the path of least resistance for the target audience.

Move fast. The window for a third-party Claude Code companion app is open now but will not stay open forever.
