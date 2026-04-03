# Codex Switchboard Commercialization Roadmap

## Document Status

- Owner: Oz Levy
- Product: Codex Switchboard
- Scope: Productization, commercialization, marketplace, and operational roadmap
- Status: Working roadmap
- Last updated: 2026-04-03

## 1. Executive Summary

Codex Switchboard already solves a real workflow problem:

- multiple Codex identities
- one persistent local workspace
- no forced fragmentation into separate `CODEX_HOME` environments

What it is today:

- a strong power-user tool
- a local launcher and dashboard
- profile capture, switching, pools, and encrypted sharing

What it is not yet:

- a managed product
- a secure cloud platform
- a team-ready admin system
- a trusted marketplace

To become a commercial product, the app needs to move through three stages:

1. Product hardening
2. Managed cloud and account layer
3. Marketplace and monetization

The order matters. A marketplace on top of a fragile local utility will fail.

## 2. Product Thesis

Codex Switchboard should become:

`The multi-account workspace and routing layer for Codex teams, freelancers, and agencies.`

This means the core promise is no longer only:

- switch users quickly

It becomes:

- manage identities safely
- preserve local continuity
- route work across profiles and pools
- share reusable pool setups
- sell or distribute operational setups without exposing secrets

## 3. What We Have Today

Current shipped capabilities:

- launcher wrapper around `codex`
- `codex-swap`
- `codex ui`
- automatic profile capture
- active profile tracking
- local dashboard
- pool management
- auto-fallback on exhausted profiles
- encrypted profile bundle export/import
- pool bundle export/import
- cross-platform installers

Current strengths:

- real user pain solved
- direct workflow value
- low setup friction
- clear differentiation from `CODEX_HOME` isolation

Current weaknesses:

- local-only trust model
- no hosted identity or billing layer
- no user account system
- no audit trail
- no secure cloud sync
- no access control model
- no marketplace model
- no compliance posture

## 4. Commercial Product Goal

The product should eventually support:

- personal account management
- team workspaces
- pool creation and routing
- encrypted sync between devices
- shareable pool templates
- paid marketplace listings
- purchase flows
- seller payouts
- usage analytics
- admin moderation

Important boundary:

The platform should not become a marketplace for raw credentials or account resale.

The commercial layer should focus on:

- pool templates
- workflow bundles
- configuration packs
- team presets
- automation logic
- operational playbooks

Not on:

- selling Codex accounts
- exposing raw auth files publicly
- unmanaged credential resale

## 5. Product Principles

### 5.1 Keep the local advantage

The product must keep its core differentiator:

- same machine history
- same workspace continuity
- same folder context

### 5.2 Commercial value must add control, not friction

Paid product layers should improve:

- safety
- team usage
- speed
- governance

They should not make solo local usage worse.

### 5.3 Security is not optional

Once sharing, cloud sync, and selling are introduced, the product becomes a trust product.

That requires:

- encryption
- key management
- auditability
- clear separation between metadata and secrets

## 6. What Is Missing Today

## 6.1 Product gaps

- no formal user identity system for Switchboard itself
- no cloud account
- no persistent remote storage
- no subscription model
- no checkout
- no permissions model
- no org/team model
- no support/admin flows

## 6.2 Technical gaps

- no backend API
- no database
- no auth for the Switchboard product
- no secure secret vault
- no encrypted sync protocol
- no event logging
- no licensing/entitlements layer
- no versioned schema migration strategy
- no telemetry pipeline

## 6.3 Trust and operations gaps

- no terms of service
- no privacy policy
- no seller policy
- no marketplace moderation rules
- no fraud controls
- no recovery flows
- no billing support process

## 7. Recommended Commercial Architecture

The commercial product should be split into four layers.

### 7.1 Local runtime layer

What remains local:

- `codex` launcher
- local dashboard
- local auth file switching
- local pool execution
- local fallback logic

### 7.2 Cloud control plane

New hosted backend for:

- Switchboard user accounts
- subscriptions and entitlements
- cloud sync metadata
- team workspaces
- marketplace catalog
- purchases and payouts
- audit logs

### 7.3 Secret and sync layer

Needs explicit design:

- encrypted profile bundle storage
- device trust model
- encryption keys derived or managed safely
- optional zero-knowledge approach for uploaded bundles

### 7.4 Marketplace layer

This should support:

- listing pool templates
- listing workflow packs
- listing team presets
- import after purchase
- ratings and seller reputation
- moderation and takedowns

## 8. Recommended Product Surface

## 8.1 Free tier

Should include:

- local launcher
- local profile switching
- local auto-capture
- local dashboard
- basic pools
- local import/export

This keeps adoption high and protects the open-source funnel.

## 8.2 Pro tier

Should include:

- encrypted cloud sync
- multi-device profile metadata sync
- advanced pool routing
- pool health indicators
- backup and restore
- private share links
- premium support

## 8.3 Team tier

Should include:

- team workspace
- managed pools
- role-based access
- shared templates
- purchase and distribution controls
- audit logs
- usage events
- admin console

## 8.4 Marketplace layer

Should include:

- seller profiles
- listing creation
- listing approval
- paid downloads/imports
- ratings
- revenue share

## 9. Marketplace Model

There are two viable marketplace directions.

### 9.1 Safe configuration marketplace

Users buy and share:

- pool definitions
- switching strategies
- role presets
- workflow packs
- documentation packs

Pros:

- much safer
- easier to moderate
- lower legal risk
- less abuse potential

### 9.2 Encrypted private bundle marketplace

Users distribute encrypted bundles to approved buyers or team members.

Pros:

- much more powerful
- can support advanced internal sharing

Cons:

- much higher trust burden
- more abuse potential
- may require stronger KYC, abuse review, or enterprise-only constraints

Recommendation:

Start with the safe configuration marketplace.

Do not start with credential-oriented commerce.

## 10. Business Model

Recommended model:

- Open core
- SaaS control plane
- marketplace take rate

Revenue streams:

- Pro subscription
- Team subscription
- marketplace commission
- enterprise support

Possible pricing starting point:

- Free: local-only core
- Pro: $12 to $24 per seat per month
- Team: $39 to $99 per workspace per month plus seats
- Marketplace take rate: 10% to 20%

## 11. Required Backend Domains

To commercialize properly, we need these backend domains:

### 11.1 Identity domain

- Switchboard user account
- session management
- email login or OAuth
- device registration

### 11.2 Entitlements domain

- plans
- subscriptions
- billing state
- feature flags

### 11.3 Workspace domain

- users
- teams
- memberships
- roles
- workspaces

### 11.4 Catalog domain

- marketplace listings
- listing versions
- pricing
- seller metadata
- moderation state

### 11.5 Purchase domain

- checkout
- orders
- receipts
- payouts
- refund handling

### 11.6 Sync and vault domain

- encrypted bundle objects
- metadata indexes
- key versioning
- bundle access grants

### 11.7 Telemetry and audit domain

- installs
- active devices
- pool switch events
- import/export events
- purchase events
- moderation events

## 12. Security Requirements

This is the minimum bar before asking users to trust a commercial layer.

- Encrypt exported secret-bearing bundles at rest and in transit.
- Separate metadata from encrypted payloads.
- Never expose raw auth in public marketplace listings.
- Add signed bundle formats and version validation.
- Add tamper detection.
- Add audit logs for imports, exports, and activations.
- Add revocation flows for leaked or compromised bundles.
- Add abuse detection for suspicious seller activity.
- Define secret handling policies clearly.

## 13. Legal and Policy Requirements

Before launch:

- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Marketplace Seller Policy
- Takedown and abuse policy
- Refund policy
- Support SLA definition

Potential legal sensitivity:

- identity sharing
- resale of access
- third-party platform terms

Recommendation:

Structure the marketplace around configuration, routing, and team tooling.

Avoid product messaging that sounds like:

- account resale
- credential trading
- access brokering

## 14. Recommended Development Phases

## Phase 0: Hardening the current app

Goal:

- make the current local product reliable enough to build on

Required work:

- formal data schema for profiles and pools
- migrations
- better diagnostics and crash handling
- stronger E2E install tests
- bundle validation and corruption recovery
- more robust Windows coverage
- better dashboard UX for pools and sharing

Exit criteria:

- installer stability
- reliable pool switching
- stable import/export
- low support burden

## Phase 1: Product identity and cloud foundation

Goal:

- give Switchboard its own user account system

Required work:

- product backend
- auth for Switchboard users
- database
- cloud workspace model
- plan management
- device registration

Exit criteria:

- users can create a Switchboard account
- devices can authenticate safely
- entitlements can control product features

## Phase 2: Cloud sync and team workspace

Goal:

- move from local utility to managed product

Required work:

- encrypted sync
- team workspace management
- shared pools
- workspace permissions
- audit logs

Exit criteria:

- a team can manage shared pool configurations
- a user can restore their setup on another machine

## Phase 3: Marketplace v1

Goal:

- launch a safe, useful marketplace

Required work:

- seller onboarding
- listing creation
- listing moderation
- checkout
- purchase-to-import flow
- ratings and reviews
- payout logic

Exit criteria:

- users can buy and import approved pool templates
- sellers can publish and update listings
- moderators can review and remove listings

## Phase 4: Commercial optimization

Goal:

- improve retention, trust, and revenue

Required work:

- subscription experiments
- marketplace analytics
- fraud tooling
- referral flows
- landing pages
- docs and onboarding improvements

Exit criteria:

- paid retention signal
- seller supply signal
- real repeat usage

## 15. Marketplace Listing Types

Recommended v1 listing types:

- Pool template
- Routing strategy preset
- Team policy pack
- Client handoff pack
- Shared ops bundle

Possible later listing types:

- Agent workflow kits
- Vertical-specific packs
- Private enterprise marketplace entries

## 16. User Management Requirements

The product should support these user flows.

### Buyer flows

- sign up
- connect device
- browse listings
- purchase
- import to local Switchboard
- assign imported items to a workspace or pool

### Seller flows

- create seller profile
- submit listing
- upload listing assets
- version listing
- receive payout status

### Admin flows

- moderate listing
- suspend seller
- refund purchase
- review abuse reports

## 17. Risks

### 17.1 Policy risk

The product can be misunderstood as credential resale.

Mitigation:

- design the marketplace around configurations and encrypted private delivery
- write explicit marketplace rules

### 17.2 Security risk

If secret handling is weak, trust collapses.

Mitigation:

- ship cloud features only after vault, audit, and recovery exist

### 17.3 Product scope risk

Trying to ship marketplace, SaaS, and cloud sync at once will stall execution.

Mitigation:

- stage the rollout
- keep free local core stable

### 17.4 Support risk

Cross-platform installer issues can swamp a small product.

Mitigation:

- stronger automation
- diagnostics bundle
- self-check tool

## 18. Success Metrics

Track these by phase.

### Core product metrics

- installs
- weekly active launchers
- number of saved profiles
- number of active pools
- import/export usage

### Commercial metrics

- account signups
- device connections
- paid conversion
- team workspace creation
- marketplace GMV
- repeat purchases

### Trust metrics

- failed imports
- corruption incidents
- support tickets
- chargebacks
- abuse reports

## 19. Iterative Working Process

Use a recurring cycle instead of one large rewrite.

### Cycle A: Discover

- interview users
- collect installer pain
- watch where pool routing fails
- identify what users would actually pay for

### Cycle B: Define

- write one scoped PRD
- define success metrics
- define launch constraints

### Cycle C: Build

- implement one vertical slice
- keep local runtime backward-compatible
- add migrations early

### Cycle D: Validate

- internal dogfooding
- 5 to 10 design partners
- measure activation and support burden

### Cycle E: Harden

- remove brittle assumptions
- improve onboarding
- add rollback and support tools

Repeat per major layer:

- local hardening
- cloud account layer
- sync
- marketplace

## 20. Recommended Immediate Next Steps

These are the highest-leverage steps now.

### Next 2 weeks

- stabilize pools and sharing UX
- add diagnostics and self-check commands
- define profile and pool schemas formally
- write security boundaries for bundle handling
- create product architecture doc for backend and cloud sync

### Next 4 to 6 weeks

- build SaaS architecture proposal
- define database model
- define billing and entitlement model
- define marketplace policy and listing model
- ship a cleaner dashboard surface for pools and sharing

### Next 6 to 10 weeks

- implement account system prototype
- implement cloud sync prototype for non-secret metadata first
- test design-partner flow with freelancers or small agencies

## 21. Suggested Build Order

If we want to move fast without building the wrong company, this is the order:

1. Harden the current local product.
2. Build the Switchboard account system.
3. Add cloud sync for metadata first.
4. Add encrypted bundle sync.
5. Add team workspace controls.
6. Launch a safe marketplace for pool templates and configs.
7. Add paid seller and buyer operations.

## 22. Definition of Done for “Commercial-Ready v1”

We can call the app commercially ready when all of these are true:

- the local runtime is stable
- installs are predictable across platforms
- profile and pool data are versioned and recoverable
- cloud identity exists
- billing exists
- sync exists
- audit logs exist
- marketplace moderation exists
- legal policies exist
- users can buy, import, and manage approved listings safely

## 23. Final Recommendation

Do not jump directly from local utility to open marketplace.

Build the business in this order:

- trusted local runtime
- managed cloud account
- team and sync value
- safe marketplace

That path gives the product the best chance to become commercial without turning into a fragile or risky auth-sharing tool.
