# Local fork deployment

## Boundary

Only push to `https://github.com/petealbertson/open-webui.git`. Upstream is read-only: no pushes, issues, or pull requests. This checkout has `remote.upstream.pushurl=/dev/null` and `remote.pushDefault=origin`. Those settings are local Git configuration and must be reapplied in a fresh clone.

## Deployment on September 6, 2026

- Upstream latest stable was verified through the read-only GitHub releases API: **v0.11.3**, published August 31, 2026; commit `2a960a59fe1dbbd35282f0556b3666d81102e781`.
- The stalled merge was completed, retaining the fork frontend. Backend source matches v0.11.3 exactly.
- `Dockerfile.mobile-ui` pins the upstream v0.11.3 image by digest and copies the completed frontend build into the image.
- Running container: `open-webui`; image: `open-webui-mobile:0.11.3`; port: `8000:8080`; restart policy: `always`.
- The only mount is the persistent `open-webui` volume at `/app/backend/data`. Do not mount the working tree or build output into production. The previous build replaced the bind-mounted directory, leaving the old container with missing assets and a 404 homepage.
- Existing runtime overrides and the generated signing key were preserved in a mode-0600 environment file under `/home/exedev/deploy-backups/20260906/`. Never commit that file or container inspection output.

## Validation

- The recovered production build completed successfully (`/tmp/build_out.log`).
- Frontend tests: 2 files, 10 tests passed (`/tmp/update-tests.log`).
- No unmerged index entries or whitespace errors; backend has no differences from upstream v0.11.3.
- Docker health check, `/health`, homepage, referenced assets, and `/api/version` passed. Version reports `0.11.3`.
- Browser sign-in page rendered. Existing authenticated client requests for chats, settings, and models returned 200 in service logs. No test chat was sent to a provider.
- SQLite `quick_check` passed. Counts matched the stopped pre-upgrade backup: 2 users, 91 chats, 12 files, and 345 config records.
- An independent review through the llm-2 integration caught the outdated image base (fixed). It also noted pre-existing `mobile` versus `$mobile` sizing conditions in the fork; these were confirmed present before the update and left unchanged to avoid expanding this recovery into a UI rewrite.

## Backup and rollback

`/home/exedev/deploy-backups/20260906/` contains:

- `data-before-0.11.3.tar.gz`: consistent backup taken while the old container was stopped, including SQLite/WAL, uploads, and vector data. Only the regenerable `cache` directory was excluded.
- `container.json`: original container configuration (private).
- `webui-secret-key` and `runtime.env`: preserved signing key and runtime overrides (private).
- `merge.patch`: staged recovery snapshot.

The old image is retained as `open-webui-mobile:rollback-20260906`. The old container is retained, stopped, as `open-webui-rollback-20260906` with automatic restart disabled. **Do not simply restart it:** it still points at mutable checkout files and shares the production data volume.

For rollback, stop the new container, snapshot its data first, restore the pre-upgrade archive into a **new** named volume, and create a replacement container from the rollback image using that volume, the preserved environment, and port 8000. Do not mount frontend or Python source files. Keep the current volume intact until rollback is verified. Never run two containers writing the same application database.

## Operational cautions

- Approximately 1 GiB disk space remained after retaining both release images. Disposable npm cache, `node_modules`, and Svelte build intermediates were removed after build/tests; source, lockfile, deployed build, old image, and persistent data were retained. Run `npm ci` before further frontend development, and provision more disk before the next build/update. Avoid broad Docker prune commands that could destroy rollback artifacts.
- The existing Ollama configuration refers to unresolved `host.docker.internal`. This error also appeared before deployment; it is not an upgrade regression. Provider configuration was not changed in this recovery.
- For future updates, build in isolation, verify the image and available disk space, stop briefly for a consistent data backup, then replace the production container. Never build into a live bind mount.
