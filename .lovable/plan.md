

## Auth Page Premium Redesign

### Current Problems
- Left panel is visually empty and underutilized -- just logo, one line of text, and 3 plain bullet points
- No social proof, no metrics, no visual impact
- Feature list is flat and uninspiring -- no icons, no hierarchy, no descriptions
- No testimonial or trust signal
- The branding panel feels like wasted space rather than a selling point
- Right panel form is functional but plain

### Redesign Plan

**Left Panel -- Transform into a high-impact branding showcase:**

1. **Hero stats bar** at the top -- 3 glowing metric pills showing social proof:
   - "+500 e-commerces" | "R$50M+ gerenciados" | "4.9/5 satisfacao"

2. **Richer feature cards** -- Replace flat bullet list with 3 feature cards, each with:
   - Distinct icon (BarChart3, Calculator, Brain)
   - Bold title
   - One-line description
   - Subtle glass card background with hover glow

3. **Testimonial block** at the bottom -- A quote from a user with name/role/avatar placeholder, adding credibility

4. **Visual polish:**
   - Animated gradient orb/glow behind the content for depth
   - Staggered motion animations on each element
   - Subtle radial gradient overlay for premium feel

**Right Panel -- Elevate the form UX:**

1. Add a subtle welcome icon/illustration above the heading
2. Improve input styling with icons inside fields (Mail, Lock icons)
3. Add subtle divider line and "ou" text before the signup CTA
4. Polish spacing and typography hierarchy

**Technical approach:**
- Single file edit: `src/pages/Auth.tsx`
- Uses existing dependencies: `motion/react`, `lucide-react`, existing UI components
- No new dependencies needed
- All changes are cosmetic/presentational -- zero logic changes

