- [x] Verify that the copilot-instructions.md file in the .github directory is created. Completed.

- [x] Clarify Project Requirements. Completed (Next.js + TypeScript + Tailwind + Feedly integration).

- [x] Scaffold the Project. Completed via manual in-place scaffold because folder name `BTJ.RSSReader` is not valid for `create-next-app` package naming.

- [x] Customize the Project. Completed with Feedly OAuth login/callback, unread article list, article reader pane, and mark-as-read on click.

- [x] Install Required Extensions. Completed (no required extensions were provided by setup info).

- [x] Compile the Project. Completed (`npm run lint` and `npm run build` pass).

- [x] Create and Run Task. Completed (skipped, standard npm scripts are sufficient for this project).

- [x] Launch the Project. Completed (deferred in-tool launch; run `npm run dev` to start locally).

- [x] Ensure Documentation is Complete. Completed (`README.md` updated and HTML comments removed from this file).

- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.

## Task Tracking Rules

- For every completed item implemented from `NEXT_STEPS.md`, immediately update tracking docs in the same session:
	1. Run validation (`npm run lint` and `npm run build`) and report status.
	2. Mark the item as completed in `NEXT_STEPS.md`.
	3. Add/update the corresponding completion entry in `COMPLETED_TASKS.md`.
- Only mark items as completed in tracking docs after validation succeeds.
- When user asks to "continue," select the next pending item from `NEXT_STEPS.md` unless the user specifies a different item.
- For every newly added completed entry in `COMPLETED_TASKS.md`, include a completion date (chronological ordering is not required).
- Treat this tracking workflow as required project process for all future tasks.
