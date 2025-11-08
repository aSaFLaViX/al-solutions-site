# Agent Instructions for Codex and AI assistants

This document provides context and guidance for AI coding assistants (such as OpenAI Codex) when working on this repository.  The goal is to help the assistant understand the business domain, design principles and user preferences captured during our conversations.

## Context

This repository hosts the website for **AL Solutions**, a consultancy founded by **Asaf Lavi** that specialises in *operational AI systems*.  Key capabilities include:

- **Knowledge Bots** – Retrieval‑augmented agents that read manuals, policies, FAQs and databases to answer questions with citations.
- **Data Copilot API** – A service that translates natural‑language questions into SQL/ES|QL/BigQuery queries, executes them and returns results with business explanations.
- **Multi‑Agent Orchestration** – Designing and implementing cooperating agents (planner, retriever, query generator, composer, QA) for complex reasoning tasks.
- **Custom AI Pipelines** – End‑to‑end ingestion, embedding and vector indexing pipelines, exposed via APIs or chat interfaces.

The website follows a **modern dark‑themed design** with subtle gradients and pastel accents.  The copy emphasises **results and business outcomes** rather than implementation details, and is intentionally generic to appeal to a broad range of clients (support teams, research organisations, SMB finance, etc.).

## Goals and guidelines

When making changes or additions:

1. **Maintain separation of concerns.**  Keep HTML files focused on content and structure; place all styling in `css/style.css`.  Use semantic HTML (e.g. `<header>`, `<section>`, `<footer>`).
2. **Preserve the dark theme.**  The design uses a dark background with blue‑purple accents and generous whitespace.  Reuse existing CSS variables for colours and spacing.
3. **Write accessible code.**  Ensure sufficient contrast, meaningful alt text for images, keyboard navigation and responsive layouts.  Consider adding light‑mode support as per the TODO file.
4. **Emphasise outcomes.**  When adding copy or examples, focus on how AL Solutions reduces support times, enables self‑service insights or accelerates development.  Avoid exposing proprietary code or specific client data.
5. **Use the correct contact details.**  The company email is `asaflavi9@gmail.com` and the LinkedIn profile is `https://www.linkedin.com/in/asaf-lavi-ai/`.  CTA buttons should direct users to the contact page or a mailto link with a clear subject like “Discovery Call Request”.
6. **Follow the project roadmap.**  See `TODO.md` for upcoming features (blog/resources section, dark/light toggle, CRM‑integrated contact form, testimonials, interactive demos).  When implementing these, adhere to the established look‑and‑feel and keep the user experience simple.
7. **Do not invent features.**  If you’re unsure whether a new section or functionality is desired, leave placeholders or comments rather than guessing.  Align with the client’s preferences and previous instructions.

## Conversation history and preferences

During the development of this repository, the following key points were discussed:

- The design should be **user‑friendly and on‑trend**, incorporating dark mode, clear typography, generous spacing, minimalistic layouts, and subtle micro‑interactions【917625664407683†L463-L468】【607248337806527†L175-L191】.
- The site structure should be **multi‑page** (home, services/use cases, about, contact) rather than a single landing page, to give visitors a complete overview without overwhelming them【493771304235383†L60-L69】.
- Service descriptions must remain **generic** yet compelling, highlighting categories like knowledge bots, data copilot, multi‑agent orchestration and custom pipelines, without disclosing implementation details.
- The content highlights **Asaf Lavi’s expertise**: 15+ years of AI and software architecture experience, from automotive safety systems to enterprise AI prototypes and multi‑agent orchestration.
- The website now uses **asaflavi9@gmail.com** as the contact email and includes a link to Asaf’s LinkedIn profile.
- Future additions (blog, CRM forms, theme toggles) are outlined in TODO.md and should be considered when making changes.

## Final note

These instructions are meant to ensure that AI assistants produce code and content that align with the business identity of AL Solutions and the owner’s intentions.  When in doubt, prefer clarity, accessibility and maintainability over cleverness.  Always respect user data and do not expose sensitive information.
