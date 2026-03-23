
Fix goal: make Dash visually robust and modern on desktop, and stop hidden upload transport data from leaking into the chat transcript.

What’s actually wrong
1. This is not just a CSS issue. `DashInput` currently appends `[Attached files: ...]` and `[File URLs: ...]` directly into the user message text, so the UI is rendering raw signed URLs by design.
2. `DashWorkspace`/`useDashChat` only pass a single text string, so transport payload and display copy are coupled.
3. `DashMessageList` renders raw markdown without aggressive long-string wrapping, so signed URLs and technical error text overflow the bubble.
4. The desktop shell is still cramped: history/workflows sit above the transcript, so the actual readable chat column is narrower than it should be.
5. Some assistant error copy still exposes internal tool names, which looks broken even when it technically fits.

Implementation plan
1. Separate display content from transport content
- Update the Dash message shape to support clean visible text plus optional attachments metadata.
- Change `DashInput` to send structured attachment info instead of stuffing file URLs into the visible prompt.
- Keep the backend request compatible by generating hidden transport text only at send time, while storing/rendering only the clean prompt in chat/history.

2. Sanitize existing and future transcript rendering
- Add a display sanitizer in `useDashChat` / session-history loading so older sessions with `[File URLs: ...]` are cleaned before rendering.
- Preserve attachment metadata in `messages_json` so reload/history restore still shows proper file chips instead of raw URLs.

3. Rebuild the message layout for overflow safety
- In `DashMessageList`, constrain bubble width consistently and align assistant/user bubbles cleanly.
- Add `break-words` / `overflow-wrap:anywhere` behavior for markdown paragraphs, links, code/pre blocks, tables, and any plain text fallback.
- Render attachments as compact chips/cards above the user text.
- Style long technical outputs so they wrap inside the card instead of escaping the container.

4. Improve the desktop Dash shell
- Refactor `DashWorkspace` into a wider desktop layout: side rail for History + Saved Workflows, main column for transcript + composer.
- Use a larger max width, proper `min-w-0` / `min-h-0` handling, and sticky header/composer so the conversation area stays readable and stable.
- Keep the current stacked behavior for smaller breakpoints.

5. Clean up user-facing error language
- In the backend function, normalize file-processing failures so users never see internal tool names or orchestration wording.
- Fix the attachment fallback parsing mismatch (`[Attached files: ...]` vs current fallback regex) so the recovery path is actually reliable if raw transport text still appears.

Files to update
- `src/components/dash/DashInput.tsx`
- `src/hooks/useDashChat.ts`
- `src/components/dash/DashMessageList.tsx`
- `src/pages/DashWorkspace.tsx`
- `src/components/dash/DashSessionHistory.tsx`
- `supabase/functions/dash-command/index.ts`

Technical details
- No database migration should be needed; the existing session JSON can store richer message objects.
- I’ll make the frontend backward-compatible so old saved sessions render cleanly even before users start new conversations.
- The visual fix will address both causes of the screenshot:
  - true overflow/wrapping bugs
  - raw transport metadata being displayed as chat content

Acceptance checks
- Upload a PDF and send a Dash message: the bubble shows only the prompt + file chip, never a signed URL.
- Long filenames, long URLs, and long assistant errors stay inside the card.
- History reload/open still renders attachments and approval cards cleanly.
- Desktop Dash feels wider and more balanced, with readable spacing and no text escaping its container.
