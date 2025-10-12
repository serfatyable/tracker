# Project Structure Guidelines

## ⚠️ IMPORTANT: Next.js 15 App Router Structure

This project uses **Next.js 15 with App Router**. The structure MUST be maintained as follows:

### Directory Structure

```
/tracker
├── /app                    # ✅ Routes go here (NOT /src/app)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── /auth              # Auth pages
│   ├── /admin             # Admin pages
│   └── ...
├── /components            # ✅ React components (NOT /src/components)
├── /lib                   # ✅ Utility functions (NOT /src/lib)
├── /types                 # ✅ TypeScript types (NOT /src/types)
├── /test                  # ✅ Test setup (NOT /src/test)
├── /i18n                  # Translation files
├── /public               # Static assets
└── next.config.js        # Next.js config
```

### ❌ DO NOT Use `/src` Directory

Next.js 15 App Router has issues discovering routes under `/src/app/`. While technically supported, it causes:
- Routes returning 404
- Build manifest errors
- Missing server-side pages
- Webpack cache corruption

### ✅ Correct Import Paths

Since everything is at the root level:

```typescript
// ✅ Correct
import TextInput from '@/components/auth/TextInput';
import { signIn } from '@/lib/firebase/auth';
import type { UserProfile } from '@/types/auth';

// ❌ Wrong (assumes src/ directory)
import TextInput from '../../components/auth/TextInput';
```

### Path Aliases

The project uses aliases pointing to root and key folders:

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@app/*": ["app/*"],
      "@components/*": ["components/*"],
      "@lib/*": ["lib/*"],
      "@types/*": ["types/*"],
      "@i18n/*": ["i18n/*"]
    }
  }
}
```

### If You Need to Restructure

If you ever need to move files:

1. ✅ Keep `/app`, `/components`, `/lib`, `/types` at root level
2. ✅ Update imports to use aliases (`@app/*`, `@components/*`, `@lib/*`, etc.)
3. ✅ Clear `.next` cache: `rm -rf .next`
4. ✅ Restart dev server: `pnpm dev`
5. ❌ Never move routes to `/src/app`

### Troubleshooting 404s

If routes return 404:

```bash
# 1. Kill all Next.js processes
pkill -f "next dev"

# 2. Clear build cache
rm -rf .next

# 3. Verify structure
ls -la app/          # Should show your route folders

# 4. Restart dev server
pnpm dev

# 5. Check http://localhost:3000
```

### History Note

This project originally had routes in `/src/app/` which caused persistent 404 errors. Moving everything to root-level directories resolved all routing issues. **Do not revert to /src structure.**

