# Resident rotation items visual refresh proposal

## Goal

Make the items section on the resident rotation page feel more colorful and engaging while maintaining accessibility and the existing information density.

## Proposal

1. **Introduce domain-themed gradient cards**
   - Wrap each leaf card (rendered inside `RotationBrowser` at the `card` div around the progress badge) with a subtle gradient background that aligns with the domain grouping (`domainKey`).
   - Use a pastel gradient palette derived from the existing Tailwind theme (e.g., `from-sky-100 via-sky-50 to-white` for Knowledge, `from-emerald-100 via-emerald-50 to-white` for Skills, `from-amber-100 via-amber-50 to-white` for Guidance).
   - Ensure a fallback neutral gradient for miscellaneous domains to avoid color overload.

2. **Color-coded progress medallions**
   - Replace the current neutral `rounded-xl border` avatar with a more vibrant pill that uses color to reinforce completion:
     - 0–25%: soft red (`bg-rose-100 text-rose-700`)
     - 26–75%: amber (`bg-amber-100 text-amber-700`)
     - 76–100%: emerald (`bg-emerald-100 text-emerald-700`)
   - Keep a high-contrast border for dark-mode and ensure text meets AA contrast.

3. **Domain chips with iconography**
   - Upgrade the inline domain/category chips (`bg-muted`) to include lightweight icons (book for Knowledge, wrench for Skills, compass for Guidance) and swap the background to a translucent tint (e.g., `bg-sky-100/80`).
   - Use matching icon colors so the chip palette matches the card gradient.

4. **Highlight actionable controls**
   - Restyle the "Log activity" quick action buttons to pick up the active domain color on hover/focus, signalling interactivity.
   - For desktop, add a secondary accent border (`border-sky-300` etc.) around the quick log button when the item is under the Knowledge domain.

5. **Maintain accessibility**
   - Validate all new color pairs against WCAG 2.1 AA using the `ACCESSIBILITY_AUDIT_COLORS.md` guide.
   - Provide `prefers-reduced-motion` fallbacks for any gradient shimmer or transition effects.

## Next steps

- Align on the palette and iconography with design.
- Implement the gradient wrappers and color hooks in `RotationBrowser` while keeping the theming configurable for future rotations.
- Run visual regression tests to capture the new color system.
