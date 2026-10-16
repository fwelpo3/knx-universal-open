# Website deployment

This website is served from the `docs/` directory through GitHub Pages.

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Go to **Actions → Deploy website to GitHub Pages**, and use **Run workflow** if needed.
4. Confirm the deployment succeeds and open `https://fwelpo3.github.io/knx-universal-open/`.
5. If the site returns 404, confirm that Pages is enabled and the GitHub Actions workflow has permission to publish to Pages.

The source HTML is `docs/index.html`; the architecture artwork is `docs/assets/architecture-hero.svg`. SEO assets are `docs/robots.txt` and `docs/sitemap.xml`.

Do not claim that GitHub Pages is live before a successful deployment is verified.
