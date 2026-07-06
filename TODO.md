- [ ] Check Vercel build error root cause: `Failed to resolve /src/main.tsx from /vercel/path0/index.html`
- [ ] Ensure Vercel uses Vite correct build (vercel.json present) and does not treat project as static HTML-only
- [ ] Confirm generated dist contains correct asset references (vite build succeeded locally)
- [ ] Update Vercel configuration to explicitly set build command + use outputDirectory=dist (already present) and remove custom top-level `index.html` script tag issues if needed
- [ ] Re-run `npm run build` locally to confirm
- [ ] Provide exact Vercel steps: disconnect Git integration, reconnect, re-add project, select correct framework/build settings
- [ ] After deployment, verify GEMINI_API_KEY is set in Vercel environment variables

