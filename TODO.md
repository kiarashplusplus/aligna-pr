# TODO: Remaining Implementation Items

Based on PROMPT.md specification review. Core functionality is ~95% complete.

---

## Search Engine Coverage

1. [x] **Implement DuckDuckGo search engine** - Add `src/search/engines/duckduckgo.ts` for privacy-focused audience coverage

2. [x] **Implement dev.to API parser** - Add `src/search/engines/devto.ts` with tag-based search (recruiting, ai, voice)

3. [x] **Implement Hacker News search** - Add `src/search/engines/hackernews.ts` using Algolia HN API for "recruiting tools" discussions

4. [x] **Implement Medium publication search** - Add parser for Medium publications (Better Programming, The Startup, Towards Data Science)

---

## Contact & Outreach Automation

5. [ ] **Implement follow-up reminder system** - Add automated reminders: "Follow up with X after 5 days"

6. [ ] **Implement response tracking** - Track `contacted`, `responded`, `declined` states with dates

7. [ ] **Add email verification** - Optional MX record and SMTP connection test for discovered emails

---

## Content Analysis

8. [ ] **Implement advanced deduplication** - Detect syndicated content across sources using title/author/date matching

9. [ ] **Add competitor sentiment analysis** - Detect negative mentions (e.g., "HireVue expensive") for positioning angles

10. [ ] **Wire OpenAI for enhanced angle generation** - Use GPT to generate more personalized outreach angles (dependency exists but not connected)

---

## Reporting & UI

11. [ ] **Enhance summary report** - Match PROMPT spec with detailed top-5 breakdown, action items, file manifest

12. [ ] **Build lightweight web dashboard** - Sortable prospect table, filters by priority/publication/date, export buttons

13. [ ] **Add success metrics tracking** - Track response rate, backlink acquisition rate, false positive rate

---

## Stretch Features

14. [ ] **Multi-language support** - Detect article language, generate outreach in author's language

15. [ ] **Founder credibility angle automation** - Auto-detect MIT/startup mentions and inject founder angle

---

## Priority Order

**High Priority (completes core spec):**
- Items 1-4 (search coverage)
- Item 11 (reporting)

**Medium Priority (improves workflow):**
- Items 5-6 (follow-up tracking)
- Item 8 (deduplication)

**Low Priority (nice-to-have):**
- Items 7, 9-10, 12-15
