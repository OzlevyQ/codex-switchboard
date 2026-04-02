# Codex Switchboard Website PRD

## Document Status

- Owner: Oz Levy
- Product: Codex Switchboard
- Surface: Public marketing website
- Chosen design direction: `Cinematic 3D Hero`
- Status: Draft for implementation
- Last updated: 2026-04-02

## 1. Executive Summary

Codex Switchboard is a developer utility that makes multi-account usage in
`codex` practical without fragmenting the local workflow.

Instead of isolating users into separate `CODEX_HOME` environments, Codex
Switchboard swaps only `~/.codex/auth.json`, preserving:

- local Codex history
- workspace state
- folder context
- the normal developer flow inside the same project directory

The purpose of this website is to turn that utility into a product narrative.
The site should not feel like a generic GitHub README in browser form. It
should position Codex Switchboard as a serious developer product with a clear
problem, strong differentiation, visual identity, and a path toward commercial
packaging.

The selected visual direction is `Cinematic 3D Hero`, which means the website
should feel premium, spatial, and high-end, with the hero section doing heavy
work to communicate the product thesis:

`multiple Codex identities, one continuous local workspace`

## 2. Product Context

### 2.1 What the project is today

Codex Switchboard currently includes:

- a `codex` wrapper with account-aware launcher
- `codex-swap` for direct profile switching
- `codex ui` and `codex-switchboard-dashboard`
- automatic profile capture after `codex login`
- local profile persistence
- cross-platform install and uninstall scripts
- support for macOS, Linux, and Windows
- public GitHub repo and one-line install flow

### 2.2 Core user problem

Users who work with more than one Codex identity often hit a poor tradeoff:

- either keep one global login and constantly log out and back in
- or isolate each identity using separate `CODEX_HOME` setups

The second option solves account separation, but usually breaks the feeling of a
continuous workspace. The user loses the sense that the same machine and the
same folder are carrying forward context over time.

Codex Switchboard exists to remove that tradeoff.

### 2.3 Why the website matters

Right now, the product value is real, but the presentation is still closer to:

- a repository
- a utility
- a clever workflow hack

The site needs to reposition it as:

- a well-designed product
- a serious workflow improvement
- a foundation for paid value later

## 3. Product Narrative We Need The Website To Deliver

The website must communicate five things clearly:

1. Codex Switchboard solves a painful real workflow problem.
2. Its approach is meaningfully different from isolated `CODEX_HOME` setups.
3. It preserves what users care about most: local history and workspace
   continuity.
4. It is simple to install and fast to understand.
5. It has enough polish and clarity to justify future paid trust.

## 4. Website Goals

### 4.1 Primary goals

- Explain the product in under 20 seconds.
- Make the differentiation obvious.
- Drive GitHub visits and installs.
- Make the project feel credible and product-grade.

### 4.2 Secondary goals

- Prepare the brand for future paid plans.
- Capture intent from freelancers, agencies, and dev teams.
- Create a reusable visual system for future landing pages and docs.

### 4.3 Non-goals

- We are not building a full docs site in this phase.
- We are not building a customer dashboard in this phase.
- We are not optimizing for SEO-first content depth yet.
- We are not trying to explain every edge case from the repo.

## 5. Primary Audiences

### 5.1 Solo power users

Developers using more than one Codex identity who want speed, continuity, and
less auth friction.

### 5.2 Freelancers

Users switching between personal and client identities who need the same project
folder to remain useful across sessions.

### 5.3 Agencies and small teams

Groups likely to value future team controls, shared conventions, and project-to-
identity mapping.

## 6. Positioning Statement

Codex Switchboard is the multi-account workspace layer for Codex. It lets users
switch identities without breaking local history, folder context, or workspace
continuity.

## 7. Core Messaging

### 7.1 Primary headline territory

The hero headline should communicate one strong idea:

- Switch Codex accounts without losing local context

Alternative message territory:

- Multiple Codex identities. One continuous workspace.
- Keep the same machine history. Change only the login.
- Multi-account Codex usage without the empty-workspace problem.

### 7.2 Supporting claims

- Swaps only `~/.codex/auth.json`
- Preserves local machine history
- Keeps the same folder and workspace state
- One-line install
- Works on macOS, Linux, and Windows

### 7.3 Proof anchors

- `codex`
- `codex-swap`
- `codex ui`
- local dashboard
- automatic profile capture

## 8. Chosen Design Direction

### 8.1 Direction name

`Cinematic 3D Hero`

### 8.2 Why this direction

This direction gives the product more weight than a standard dev tool landing
page.

It should visually express:

- one stable core workspace
- multiple identities orbiting or switching around it
- continuity instead of fragmentation

### 8.3 Visual principles

- premium and serious, not playful
- spatial depth without looking like a game
- a strong hero object or 3D terminal sculpture
- restrained palette, not random gradients
- bold typography with technical clarity
- product-first visuals, not stock illustrations

### 8.4 Things to avoid

- generic SaaS cards
- purple-on-white startup design
- overbusy dashboards in the hero
- fake enterprise clichés
- abstract shapes with no semantic link to the product

## 9. Website Structure

The first shipped version should contain these sections in roughly this order.

### 9.1 Hero

Purpose:

- communicate the product in one glance
- create a premium first impression
- establish the “multi-account without losing context” thesis

Content:

- headline
- one supporting paragraph
- primary CTA: GitHub
- secondary CTA: Install / View commands
- 3D hero visual

### 9.2 Problem / Tradeoff section

Purpose:

- name the current pain clearly
- show why isolated `CODEX_HOME` setups feel wrong

Content:

- what breaks in the old workflow
- why the current alternatives are clumsy
- contrast between isolation and continuity

### 9.3 How It Works

Purpose:

- make the implementation idea simple

Content:

- swaps only `~/.codex/auth.json`
- keeps the same local Codex state
- preserves the same folder context

### 9.4 Feature section

Purpose:

- turn implementation details into product benefits

Content:

- launcher preview before startup
- one-key switching
- `codex-swap`
- automatic profile capture
- local dashboard
- cross-platform install

### 9.5 CLI Flow section

Purpose:

- prove this is real and usable

Content:

- terminal snippet for `codex`
- terminal snippet for `codex-swap`
- terminal snippet for `codex ui`

### 9.6 Install section

Purpose:

- reduce friction to first trial

Content:

- macOS/Linux one-line install
- Windows one-line install
- cross-platform trust messaging

### 9.7 Dashboard preview

Purpose:

- show there is a visual management layer, not only shell commands

Content:

- dashboard screenshot or stylized preview
- explanation of when users would use it

### 9.8 CTA footer

Purpose:

- convert high-intent visitors

Content:

- GitHub CTA
- optional star request
- optional future waitlist CTA

## 10. Functional Requirements

### 10.1 MVP requirements

- responsive desktop-first landing page
- production-quality hero section
- real command snippets
- real install commands
- clear CTA to GitHub repo
- visual consistency with product tone

### 10.2 Nice-to-have in the first pass

- subtle animation in hero
- hover interaction on product visual
- command copy buttons
- screenshot carousel or design transitions

### 10.3 Future additions

- testimonials or early quotes
- changelog and release notes
- waitlist capture
- pricing preview section
- comparison page vs isolated `CODEX_HOME`

## 11. Content Requirements

All content on the website should be derived from real product behavior.

We should not claim:

- shared cloud sync if it does not exist
- team management if it does not exist
- enterprise security guarantees that are not implemented

We can hint at future direction, but the main site must stay honest and
grounded in the current product.

## 12. Success Metrics

### 12.1 Launch metrics

- click-through rate to GitHub repo
- copy/install interaction rate on command blocks
- scroll depth to install section
- number of installs after launch

### 12.2 Product-adjacent metrics

- repo stars after launch
- issues or feedback from new users
- number of users who successfully install
- percentage of users who save at least one profile

## 13. Implementation Plan

### Phase 1: Narrative and structure

Deliverables:

- final information architecture
- final section order
- headline and core copy
- CTA hierarchy

Output:

- approved wireframe and copy skeleton

### Phase 2: Visual exploration

Deliverables:

- Stitch explorations
- selection of final direction
- visual references for hero object, terminal treatment, and section styling

Output:

- approved art direction

### Phase 3: Website implementation

Deliverables:

- hero implementation
- responsive layout
- install blocks
- command examples
- feature sections
- dashboard preview

Output:

- local working website

### Phase 4: Polish and proof

Deliverables:

- micro-interactions
- motion cleanup
- spacing and typography pass
- content QA against actual repo behavior

Output:

- release candidate

### Phase 5: Launch

Deliverables:

- GitHub Pages or deployment target
- announcement copy
- screenshots/GIFs
- analytics if needed

Output:

- public website launch

## 14. Iteration Process

This project should be run as a repeating product loop, not a one-shot design
task.

### 14.1 Iteration loop

1. Define the next hypothesis
2. Build the smallest convincing version
3. Review the result against product truth
4. Compare against install and engagement feedback
5. Refine visual system and copy
6. Repeat

### 14.2 Review questions for each cycle

- Does the hero explain the product fast enough?
- Is the differentiation obvious without reading deeply?
- Does the site feel like a tool engineers would trust?
- Is the CTA too early, too late, or too weak?
- Are we showing reality, or marketing fantasy?

### 14.3 Design review cycle

For each major pass:

1. Review composition
2. Review hierarchy
3. Review clarity of product story
4. Review visual originality
5. Remove anything that feels generic

### 14.4 Product review cycle

For each copy or feature section:

1. Validate against actual repo behavior
2. Confirm commands are current
3. Confirm no misleading product claims
4. Confirm the site is still aligned with future monetization

## 15. Risks

### 15.1 Risk: looks impressive but says little

Mitigation:

- force the hero to carry both emotion and explanation
- keep the product truth prominent

### 15.2 Risk: generic dev-tool landing page

Mitigation:

- insist on one strong visual thesis
- use the selected 3D/spatial direction with restraint and purpose

### 15.3 Risk: overpromising the roadmap

Mitigation:

- distinguish clearly between current product and future commercial direction

### 15.4 Risk: beautiful but not trustworthy

Mitigation:

- show real commands
- use concrete product behavior
- keep copy specific and technical where needed

## 16. Open Questions

- Should the first version include a public waitlist or stay GitHub-first?
- Should pricing be hinted at now or only after more product hardening?
- Do we want the first public site to be static HTML/CSS/JS or a richer app
  stack?
- Should the hero visual be rendered as CSS/WebGL/video, or approximated with a
  static composition first?

## 17. Immediate Next Steps

1. Select the final Stitch direction based on the first option.
2. Freeze the website section order.
3. Write final marketing copy for hero, problem, and install sections.
4. Decide the technical implementation surface for the site.
5. Build the first website version from the chosen design direction.
6. Run a polish pass specifically on the hero and install flow.
7. Launch and collect real behavioral feedback.

## 18. Definition Of Done

The website is done for v1 when:

- the product is understandable in one screen
- the design feels premium and intentional
- the install path is obvious
- the GitHub CTA is strong and credible
- the site clearly expresses the product differentiation
- the content accurately reflects what the product does today
- the page feels like the start of a company, not only a repo
