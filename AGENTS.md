# Saywaht Developer Guide

## Architecture Patterns

### SSR & Client Islands
This project uses Next.js App Router with a hybrid SSR/client-side pattern:

- **Server Components** (default): Used for pages that fetch data server-side (landing, templates listing, template details)
- **Client Islands** (`use client`): Used only for interactive components (wallet connect, animations, search/filter UI)
- **Pattern**: Create `page.tsx` as Server Component that fetches data, pass to client components as props

Example:
```tsx
// app/templates/page.tsx (Server Component)
export default async function TemplatesPage() {
  const categories = await fetchTemplateCategories();
  return <TemplatesPageClient initialCategories={categories} />;
}

// components/templates/templates-page-client.tsx (Client Component)
export function TemplatesPageClient({ initialCategories }) {
  // Interactive: search, filter, tabs
}
```

### Loading & Error Boundaries
- `app/loading.tsx` - Global skeleton UI
- `app/error.tsx` - Global error boundary with retry
- Route-specific loading.tsx files for custom skeletons

### Store Architecture
- **Lazy Loading**: Editor stores (media-store, project-store, timeline-store, playback-store, canvas-store, scene-store) should be dynamically imported only when the user enters the editor, not at browse time
- **Selectors**: Always use selectors to minimize re-renders: `useStore(s => s.property)`

### Bundle Optimization
- Heavy libraries (ethers, recharts, wavesurfer, canvas-confetti, HuggingFace) should use `next/dynamic({ ssr: false })`
- Web3 providers should be lazy-loaded

### ISR for Static Content
Template detail pages use ISR for fast loads + SEO:
```tsx
export const revalidate = 60;
export async function generateStaticParams() {
  // Pre-render popular templates
}
```

## Key Commands
```bash
# Development
npm run dev

# Build
npm run build

# Type check
cd apps/web && npx tsc --noEmit
```
