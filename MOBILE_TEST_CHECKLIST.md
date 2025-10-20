## Mobile Testing Checklist

### Devices (emulated and physical)

- iPhone SE, iPhone 12/13/14 Pro Max, Pixel 5/7 (portrait/landscape)

### Pages

- `app/page.tsx`
- `app/admin/page.tsx` and admin sections
- `app/resident/page.tsx`
- `app/on-call/page.tsx`
- `app/morning-meetings/page.tsx`
- `app/settings/page.tsx`

### Navigation

- Hamburger visible on mobile, hidden on desktop
- Drawer opens, focus trapped, body scroll locked, closes on overlay/Esc/route change
- RTL: drawer anchors to right, tab order correct

### Tables

- Wrapped in `overflow-x-container`, core columns visible at xs
- Low-priority columns hidden at `sm`/`md`
- Sticky first column remains visible while scrolling (LTR/RTL)

### Charts

- If added later: use `ResponsiveContainer`, parent has `min-h-[200px]`

### Forms and grids

- Inputs/buttons `w-full` at xs, action bars stack
- Grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`

### Modals and popovers

- Modals full-height on mobile, scrollable content, safe bottom padding
- Popovers/menus not clipped; width <= 90vw; long text wraps

### Long text & wrapping

- `truncate`, `line-clamp`, `break-anywhere` where needed

### Accessibility

- Tap targets >= 44x44
- Visible focus ring inside scroll containers
- Contrast okay in light/dark

### Performance

- Lighthouse Mobile on key pages (Performance, Best Practices, Accessibility, SEO)

### Acceptance

- No unintended horizontal scroll
- Intended scroll areas have clear affordances
- Drawer/modals usable; tables readable; RTL mirrors correctly
