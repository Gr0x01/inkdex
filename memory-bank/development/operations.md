---
Last-Updated: 2025-12-29
Maintainer: RB
Status: Active Guidelines
---

# Operations: Tattoo Artist Discovery Platform

## Quality Gates

### Code Quality
- **Linting**: ESLint with Next.js config + accessibility rules
  - Must pass without warnings before commit
  - Pre-commit hook: `npm run lint`
  - Config: `.eslintrc.json` (strict mode, no unused vars, a11y rules)
- **Type Checking**: TypeScript strict mode
  - Must pass before deployment
  - Run: `npm run type-check`
  - Zero type errors policy
- **Code Reviews**: Required for significant changes
  - Use `code-reviewer` subagent after implementing features
  - Address Critical issues before handoff
  - Document significant feedback in commit messages
- **Formatting**: Prettier + Tailwind plugin
  - Auto-format on save (VSCode)
  - Run: `npm run format`
  - Config: `.prettierrc` (2-space indent, single quotes, trailing commas)

### Testing Requirements
- **MVP Approach**: Manual testing prioritized over automated (8-week timeline)
  - Manual testing of all user flows
  - Mobile responsive testing (iOS Safari, Android Chrome)
  - Cross-browser testing (Chrome, Safari, Firefox)
  - Search quality validation (70%+ relevant matches)

- **Post-MVP Testing** (Weeks 9-12):
  - Unit tests: Jest + React Testing Library for critical components
  - E2E tests: Playwright for search flow (image upload → results)
  - Visual regression: Percy or Chromatic (optional)
  - Test coverage: Minimum 70% for core business logic

- **Data Quality Validation**:
  - Manual curation of discovered artists (Phase 2)
  - Embedding quality checks (similarity scores >0.7)
  - Image processing validation (WebP thumbnails, no broken images)
  - Instagram scraping error rate <5%

### Performance Standards
- **Lighthouse Scores**: 90+ in all categories
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 100
  - Run before deployment: `npm run lighthouse`

- **Search Performance**:
  - Vector search latency: <500ms (IVFFlat + city filtering)
  - API response time: <1s (embedding generation + search)
  - Page load: <2s LCP (Largest Contentful Paint)
  - Image load: <1s for thumbnails (320w, 640w)

- **Bundle Size**:
  - First load JS: <200KB (Next.js bundled)
  - Route-based code splitting for heavy components
  - Dynamic imports for search, image upload
  - Run: `npm run analyze` (webpack-bundle-analyzer)

- **Database Performance**:
  - Non-vector queries: <100ms
  - Vector search: <500ms (with IVFFlat index)
  - Connection pooling: Supabase Pooler enabled
  - Monitor slow queries via Supabase dashboard

### Security Standards
- **Input Validation**: Zod schemas for all API inputs
  - Image upload: File type (jpg, png, webp), size <10MB
  - Text search: Max length 500 chars, sanitize input
  - API routes: Validate all request bodies

- **Environment Variables**: Never commit secrets
  - Use `.env.local` for development
  - Vercel environment variables for production
  - Rotate API keys quarterly (post-MVP)

- **Authentication & Authorization** (Post-MVP):
  - Supabase Auth with Instagram OAuth
  - Row Level Security (RLS) enforced on `saved_artists` table
  - Server-side auth checks via `@supabase/auth-helpers-nextjs`
  - JWT tokens in httpOnly cookies

- **Data Security**:
  - Only scrape public Instagram data
  - Respect artist opt-out (claiming enables control)
  - DMCA takedown process (post-MVP)
  - No PII collection in MVP

- **Regular Security Audits**:
  - Review dependencies for vulnerabilities: `npm audit`
  - Update dependencies quarterly
  - Use `code-reviewer` subagent for security review of critical changes

---

## Development Workflow

### Branch Strategy
- **Main Branch**: Production-ready code only
  - Auto-deploys to Vercel production (post-MVP CI/CD)
  - Protected branch (no direct commits)
  - All changes via feature branches

- **Feature Branches**: `feat/[feature-name]`
  - Example: `feat/image-upload`, `feat/artist-profiles`
  - Branch from `main`, merge back via PR

- **Hotfix Branches**: `hotfix/[issue]`
  - For critical production bugs
  - Fast-track merge to `main`

### Code Review Process
1. **Create feature branch** from `main`
2. **Implement changes** following coding standards
3. **Run quality checks locally**:
   - `npm run lint`
   - `npm run type-check`
   - `npm run build` (ensure no build errors)
4. **Use `code-reviewer` subagent**:
   - Delegate to `code-reviewer` after implementing feature
   - Review feedback (Critical/Warning/Suggestion)
   - Address Critical issues before proceeding
5. **Manual testing**: Test all affected user flows
6. **Commit changes** with conventional commit messages
7. **Update memory bank** if significant changes
8. **Deploy to Vercel preview** (automatic on PR)
9. **User approval** (RB reviews)
10. **Merge to main** → auto-deploy to production (post-MVP)

### Commit Conventions
Follow Conventional Commits format:
```
feat: Add image upload search component
fix: Fix vector search performance issue
docs: Update techStack.md with R2 configuration
refactor: Simplify artist card component
perf: Optimize IVFFlat index for 100k images
chore: Update dependencies
```

**Subagent Integration**:
- Document significant `code-reviewer` feedback in commit messages
- Example: `fix: Address RLS policy for saved_artists (code-reviewer)`

### Deployment Process

**MVP (Manual Deployments):**
1. Merge to `main` branch
2. Vercel auto-builds and deploys
3. Verify deployment via preview URL
4. Test critical flows on production
5. Monitor Vercel Analytics for errors

**Post-MVP (Automated CI/CD):**
1. Push to feature branch
2. GitHub Actions runs:
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
3. Vercel creates preview deployment
4. Manual approval required for merge
5. Merge to `main` → auto-deploy to production
6. Monitor Sentry for errors

### Release Management
- **MVP Launch**: Version 1.0.0 (Week 8)
  - Tag release: `git tag -a v1.0.0 -m "MVP launch"`
  - Announce in memory bank: `development/progress.md`

- **Post-MVP Releases**: Semantic versioning
  - Major: Breaking changes (2.0.0)
  - Minor: New features (1.1.0)
  - Patch: Bug fixes (1.0.1)

- **Changelog**: Document all releases
  - Location: `CHANGELOG.md` (root directory)
  - Format: Keep a Changelog standard

---

## Tools & Commands

### Development Commands
```bash
# Start development server
npm run dev                 # Next.js dev server (http://localhost:3000)

# Build and production
npm run build               # Build Next.js app for production
npm run start               # Start production server locally

# Code quality
npm run lint                # ESLint (check for errors)
npm run lint:fix            # ESLint (auto-fix issues)
npm run format              # Prettier (format code)
npm run type-check          # TypeScript type checking

# Analysis
npm run analyze             # Bundle size analysis (webpack-bundle-analyzer)
npm run lighthouse          # Lighthouse performance audit (install globally first)
```

### Data Pipeline Commands
```bash
# Phase 0: Market Analysis (DONE)
npm run analyze-cities      # DataForSEO city analysis

# Phase 2: Artist Discovery
npm run discover-artists    # Google Maps API discovery
npm run scrape-websites     # Scrape shop websites for artist rosters
npm run validate-instagram  # Validate Instagram handles

# Phase 3: Instagram Scraping
npm run scrape-instagram    # Apify Instagram scraper
npm run process-images      # Download + process + upload to R2

# Phase 4: Embedding Generation
npm run generate-embeddings # Modal.com CLIP embeddings (Python)
npm run batch-embeddings    # Node.js orchestration for batch processing

# Phase 7: SEO
npm run seed-styles         # Populate style_seeds table
```

### Database Commands
```bash
# Supabase local development
npx supabase init           # Initialize Supabase project
npx supabase start          # Start local Supabase instance
npx supabase db push        # Push migrations to database
npx supabase db reset       # Reset local database
npx supabase db diff        # Generate migration from schema changes

# Type generation
npx supabase gen types typescript --local > types/database.ts

# Production
npx supabase link           # Link to production project
npx supabase db push --remote  # Push migrations to production
```

### Quality Checks
```bash
# Pre-commit checks (run before every commit)
npm run lint && npm run type-check && npm run build

# Pre-deployment checks (run before production deployment)
npm run build && npm run type-check
npm run lighthouse          # Performance audit

# Security checks
npm audit                   # Check for vulnerabilities
npm audit fix               # Auto-fix vulnerabilities (if safe)
```

### Deployment Commands
```bash
# Vercel deployments
vercel                      # Deploy to preview
vercel --prod               # Deploy to production
vercel logs                 # View deployment logs
vercel env pull             # Pull environment variables
```

---

## Subagent Workflow

### Available Subagents
- **code-reviewer**: Proactive code quality, security, and maintainability reviews
  - **Use after**: Writing features, refactoring, fixing bugs
  - **Output**: Prioritized feedback (Critical/Warning/Suggestion)
  - **Integration**: Address Critical issues before handoff

- **backend-architect**: Backend system design and architecture guidance
  - **Use before**: API changes, database schema updates, scaling decisions
  - **Output**: Architecture recommendations, trade-offs analysis

- **frontend-developer**: Elite frontend specialist for modern web development
  - **Use for**: Complex UI work, state management, performance optimization
  - **Output**: Implemented components following best practices

- **ui-designer**: Visionary UI designer for rapid, implementable interfaces
  - **Use for**: Interface design, design systems, visual improvements
  - **Output**: Design mockups, component wireframes

### Delegation Triggers

**Automatic Review (After Implementation):**
```
1. Implement feature (e.g., image upload component)
2. Run local quality checks (lint, type-check)
3. Delegate to code-reviewer → Review feedback
4. Address Critical issues
5. Document significant feedback in commit message
6. Commit and push
```

**Architecture Review (Before Implementation):**
```
1. User requests backend change (e.g., "optimize vector search")
2. Consult backend-architect BEFORE coding
3. Follow architectural guidelines
4. Implement solution
5. Measure performance impact
6. Delegate to code-reviewer → Address feedback
```

**Frontend Implementation:**
```
1. User requests UI feature (e.g., "add city filter dropdown")
2. Use frontend-developer OR ui-designer (if design-heavy)
3. Implement following best practices
4. Test responsiveness (mobile, tablet, desktop)
5. Delegate to code-reviewer → Address feedback
```

### Integration Checklist
- [ ] Run quality checks before delegating to subagents
- [ ] Use `code-reviewer` after all significant code changes
- [ ] Consult `backend-architect` before database/API changes
- [ ] Document subagent recommendations in memory bank if significant
- [ ] Address Critical issues before completing task
- [ ] Include subagent feedback in commit messages when relevant

---

## Monitoring & Alerts

### MVP Monitoring
- **Vercel Analytics**: Page views, Web Vitals, errors
  - Check daily for first week post-launch
  - Alert if LCP >2s or errors spike
- **Supabase Dashboard**: Database performance, connection pool usage
  - Monitor vector search query times (target <500ms)
  - Alert if query times >1s consistently
- **Manual Testing**: Daily smoke tests
  - Test search flow (image upload → results)
  - Check artist profile pages load correctly
  - Verify Instagram links work

### Post-MVP Monitoring (Weeks 9+)
- **Sentry**: Error tracking and performance monitoring
  - Alert on errors (email + Slack)
  - Track search API latency, embedding generation time
- **Custom Metrics**:
  - Search quality: Track similarity scores distribution
  - User engagement: Searches per session, artist clicks
  - Artist claiming: Track verification funnel
- **Uptime Monitoring**: UptimeRobot or Vercel Monitoring
  - 99.9% uptime target
  - Alert if downtime >1 minute

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Vector search latency | >700ms | >1s | Tune IVFFlat index, add caching |
| Page load (LCP) | >2.5s | >4s | Optimize images, reduce bundle size |
| Error rate | >1% | >5% | Check Sentry, rollback if needed |
| Uptime | <99.5% | <99% | Investigate infra, contact Vercel support |

---

## Incident Response

### Severity Levels
- **P0 (Critical)**: Site down, data loss, security breach
  - Response time: Immediate
  - Rollback deployment, investigate, fix, redeploy
- **P1 (High)**: Search broken, major feature down
  - Response time: <1 hour
  - Hotfix branch, test, deploy
- **P2 (Medium)**: Minor feature broken, performance degraded
  - Response time: <4 hours
  - Fix in next deployment
- **P3 (Low)**: Cosmetic issue, non-critical bug
  - Response time: Next sprint
  - Add to backlog

### Incident Workflow
1. **Detect**: Monitoring alert or user report
2. **Assess**: Severity level (P0-P3)
3. **Communicate**: Log in `development/daily-log/` if deep debugging required
4. **Mitigate**: Rollback deployment if P0/P1
5. **Investigate**: Root cause analysis
6. **Fix**: Hotfix branch → test → deploy
7. **Document**: Update memory bank with lessons learned
8. **Prevent**: Add monitoring/tests to prevent recurrence

### Rollback Procedure
```bash
# Vercel instant rollback
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous working deployment
4. Click "Promote to Production"
5. Verify rollback successful
6. Investigate issue in rolled-back code
```

---

## Documentation Standards

### Memory Bank Updates
**When to Update:**
- After completing a feature (update `development/progress.md`)
- After architecture changes (update `architecture/techStack.md`)
- After discovering new patterns (update `architecture/patterns.md`)
- After Phase completion (update `development/activeContext.md`)

**Update Checklist:**
- [ ] Update `Last-Updated` metadata header
- [ ] Update `Status` if project phase changed
- [ ] Add to relevant section (avoid long narratives in living docs)
- [ ] Move historical context to `memory-bank/archive/` if outdated

### Code Documentation
- **Inline Comments**: Only where logic isn't self-evident
  - Avoid: `// Increment counter` (obvious)
  - Good: `// IVFFlat lists = sqrt(total_rows) for optimal recall`
- **Function/Component Documentation**: JSDoc for public APIs
  ```typescript
  /**
   * Searches artists by CLIP embedding similarity.
   * @param embedding - 768-dim CLIP vector
   * @param city - Optional city filter
   * @returns Ranked artists with matching images
   */
  export async function searchArtistsByEmbedding(...)
  ```
- **README**: Keep up to date with setup instructions
  - Location: `/README.md` (root directory)
  - Sections: Setup, Development, Deployment, Architecture

### API Documentation
- **Endpoints**: Document in `docs/api.md` (post-MVP)
  - Request/response schemas (Zod types)
  - Authentication requirements
  - Rate limits
  - Example requests (cURL)
- **Database Schema**: Maintain in implementation plan
  - Update when schema changes
  - Document migrations in `supabase/migrations/`

---

## Performance Optimization Workflow

### Before Optimization
1. **Measure**: Run Lighthouse audit, check Vercel Analytics
2. **Identify**: Find slowest queries, largest bundles, slow pages
3. **Prioritize**: Focus on user-facing issues (LCP, search latency)

### Optimization Techniques
- **Database**:
  - Add indexes for frequent queries (`CREATE INDEX ...`)
  - Tune IVFFlat `lists` parameter as data grows
  - Use `EXPLAIN ANALYZE` to profile slow queries
  - Enable connection pooling (Supabase Pooler)

- **Images**:
  - Use Next.js Image component (automatic optimization)
  - Generate WebP thumbnails (85% quality)
  - Lazy load images (first 6-8 eager, rest lazy)
  - Use blur placeholders (`blurDataURL`)

- **Bundle**:
  - Code splitting: Dynamic imports for heavy components
  - Tree shaking: Import only used utilities
  - Remove unused dependencies
  - Run `npm run analyze` to find large bundles

- **Caching**:
  - ISR with 24h revalidation for artist/city pages
  - Edge caching for static assets (Vercel CDN)
  - R2 CDN for portfolio images (Cloudflare)
  - Database query caching (post-MVP: Redis)

### After Optimization
1. **Measure**: Re-run Lighthouse, compare before/after
2. **Verify**: Check Vercel Analytics for real-world impact
3. **Document**: Update memory bank with optimization approach

---

## Quality Checklist (Pre-Deployment)

### Code Quality
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript type-check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code reviewed by `code-reviewer` subagent (Critical issues addressed)
- [ ] No console.logs or debug code left in production

### Performance
- [ ] Lighthouse score 90+ (all categories)
- [ ] Vector search <500ms (test with sample queries)
- [ ] Page load <2s LCP (test on 3G throttled connection)
- [ ] Images optimized (WebP, lazy loading, blur placeholders)
- [ ] Bundle size <200KB first load

### Testing
- [ ] Manual testing of all user flows (search, browse, profile pages)
- [ ] Mobile responsive (iOS Safari, Android Chrome)
- [ ] Cross-browser (Chrome, Safari, Firefox)
- [ ] Search quality validation (70%+ relevant matches)
- [ ] No broken links or 404 errors

### Security
- [ ] Environment variables not committed
- [ ] API input validation (Zod schemas)
- [ ] No sensitive data in client-side code
- [ ] RLS policies enabled (post-MVP auth)

### SEO
- [ ] Meta tags (title, description, OG images) for all pages
- [ ] Sitemap generated (`app/sitemap.ts`)
- [ ] Robots.txt configured (`app/robots.ts`)
- [ ] JSON-LD structured data for artist pages
- [ ] Internal linking (cities ↔ artists ↔ styles)

### Documentation
- [ ] Memory bank updated (`development/progress.md`, `architecture/techStack.md`)
- [ ] README up to date (setup, development, deployment)
- [ ] Commit messages follow Conventional Commits
- [ ] Significant changes documented in `CHANGELOG.md`

---

## Development Best Practices

### Minimal First Implementation (KISS + YAGNI)
1. **Ask**: "What is the smallest change that solves this?"
2. **Implement**: Only that minimum
3. **Stop**: Check in before adding abstractions or advanced error handling
4. **Follow**: KISS (Keep It Simple, Stupid) and YAGNI (You Aren't Gonna Need It)

**Example:**
```typescript
// ❌ Over-engineered (premature abstraction)
export function createImageUploader(config: UploaderConfig) {
  return new ImageUploader(config).withValidation().withRetry(3).build();
}

// ✅ Minimal first implementation
export async function uploadImage(file: File) {
  if (file.size > 10_000_000) throw new Error('File too large');
  return await fetch('/api/upload', { method: 'POST', body: file });
}
```

### Code Style Conventions
- **Components**: PascalCase (`SearchInput.tsx`)
- **Functions**: camelCase (`searchArtistsByEmbedding()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types**: PascalCase (`ArtistProfile`, `SearchResult`)
- **Files**: kebab-case for utilities (`image-processing.ts`)

### Error Handling
- **MVP**: Simple try-catch with user-friendly messages
  - Avoid over-engineering (no retry logic, fallbacks for unlikely scenarios)
- **Post-MVP**: Add error tracking (Sentry), retry logic for critical paths

### Git Workflow
- **Commit often**: Small, focused commits
- **Pull before push**: Always sync with `main` before pushing
- **Use feature branches**: Never commit directly to `main`
- **Write good commit messages**: Use Conventional Commits format

---

## Process Reminders

### Coordination & Communication
- **Deep-dive debugging**: Document in `development/daily-log/` for incident notes
- **Subagent recommendations**: Document in memory bank when significant
- **Architecture changes**: Update `architecture/techStack.md` immediately
- **When unsure**: Ask before proceeding (surprises slow the team more than questions)

### Search Before Creating
- **Respect existing patterns**: Search the repo before inventing new abstractions
- **Reuse components**: Check `components/` before creating new ones
- **Follow code style**: Check existing files for conventions

### Fast Feedback Loops
- **Run quality checks early**: Lint and type-check before committing
- **Test locally first**: Don't rely on CI/CD to catch basic errors
- **Use subagents proactively**: `code-reviewer` after features, `backend-architect` before backend changes
- **Deploy often**: Small, frequent deployments reduce risk

---

**Stay focused, keep the memory bank tight, and maintain fast feedback loops.**
