# AI-Era Specifics

Read this when the product needs to be discoverable by AI answer engines, includes a chatbot/AI
agent surface, or needs voice-search readiness.

## 1. `llms.txt` & RAG-Friendly Content Structuring

- Publish `/llms.txt` at the site root: a plain-Markdown index of the site's key pages with a
  one-line description each, so LLM crawlers/agents can find the canonical content quickly
  without parsing full HTML/nav chrome. A fuller `/llms-full.txt` can inline the actual content
  of the most important pages.
- Structure long-form content in self-contained chunks (clear H2/H3 sections that make sense read
  in isolation) — RAG systems retrieve chunks, not whole pages, so a section that depends on
  context from three paragraphs above it will retrieve poorly.
- Front-load the answer: state the key fact/definition in the first sentence of a section, then
  elaborate — this matches both how humans skim and how retrieval systems score relevance.
- Use consistent, explicit entity naming (full product/brand name, not "we" or "the platform")
  near every key claim, since retrieved chunks often lose surrounding context that would
  otherwise disambiguate a pronoun.
- Keep factual claims (pricing, specs, dates) in plain text, not only inside images or JS-rendered
  widgets that crawlers may not execute.

## 2. Chatbot / AI-Agent UX Patterns

- Always show what the agent is about to do before it does anything irreversible — a preview or
  confirmation step for destructive/costly actions (deleting data, sending an email, making a
  purchase).
- Streaming responses > spinner-then-dump: show partial output as it's generated so the wait
  feels responsive.
- Give the user a visible way to see/edit what the agent has access to (which tools, which data)
  — hidden capability erodes trust fast.
- Design a clear failure mode: when the agent can't help or is uncertain, say so plainly and
  hand off to a human path (support link, form) rather than guessing confidently.
- Keep a persistent, editable history/context indicator so users understand what the agent
  "remembers" in this session vs. not.
- Rate-limit and cost-cap agentic actions server-side — never let client-controlled loops trigger
  unbounded paid API calls.

## 3. Voice Search Optimization

- Target natural-language, question-shaped queries ("how do I...", "what is the best...") with
  content that answers them directly and concisely near the top of the page (this overlaps
  heavily with AEO — see the SEO/AEO/GEO section of the main skill).
- Keep the direct answer to a likely spoken query under ~30 words where possible — voice
  assistants often read back a short snippet, and shorter, self-contained answers get selected.
- Use FAQ schema and clear Q-as-heading formatting (`### How much does X cost?`) so both search
  engines and voice assistants can extract a clean question/answer pair.
- Optimize for local/conversational intent when relevant ("near me", "open now") if the business
  is location-based.
