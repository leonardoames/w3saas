

## Landing Page (`/`) -- Premium Redesign

### Problems
- Hero is text-only with no visual weight -- feels flat and generic
- No social proof, no trust signals, no numbers
- Feature cards are uniform and small -- no visual hierarchy or differentiation
- CTA section is bare and uninspiring
- No gradient depth, no visual storytelling, no "wow" moment
- Header is too simple -- no contrast against the hero
- Footer is a single line -- feels unfinished

### Redesign Plan

**1. Hero Section -- High-impact with depth**
- Add animated gradient orbs (same technique as Auth page) for visual depth
- Add a social proof bar below the subtitle: `+500 e-commerces | R$50M+ gerenciados | 4.9★ satisfação`
- Add a subtle badge/pill above the headline: `🚀 Plataforma #1 para e-commerces`
- Make the CTA buttons larger with a subtle glow effect on the primary button
- Add a mock dashboard screenshot/illustration below the CTAs using a glass card with fake metrics to show what users get

**2. Social Proof / Logos Section (NEW)**
- Add a "Trusted by" section with platform logos (Shopee, Shopify, Nuvemshop, etc.) in a muted grayscale row
- These assets already exist in `src/assets/platforms/`

**3. Features Section -- Visual hierarchy upgrade**
- Keep the 6 cards but add number badges (01-06) for visual rhythm
- Add subtle gradient borders on hover
- Add a checkmark list under each description with 2 key benefits

**4. Metrics/Results Section (NEW)**
- Add a "Resultados reais" section with 3 large stat cards:
  - `+18%` margem média | `2h/dia` economizados | `3.5x` ROAS médio
- Glass card styling with primary color accents

**5. CTA Section -- Premium upgrade**
- Add gradient background instead of flat border-t
- Add animated gradient orb behind the CTA
- Add trust badges: "Sem contrato", "Cancele quando quiser", "Suporte dedicado"

**6. Footer -- More complete**
- Add columns: Produto, Recursos, Suporte
- Keep it minimal but less empty

### Technical Approach
- Single file edit: `src/pages/Landing.tsx`
- Uses existing deps: `motion/react`, `lucide-react`, existing platform logo assets
- No new dependencies
- All cosmetic -- zero logic changes

