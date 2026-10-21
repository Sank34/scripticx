# AI content disclosures

Reviewed: 21 October 2026. Scope: community posts and a source review for AI integrations. This is an implementation review, not a determination of legal compliance.

## Product behavior

Authors can declare generated or substantially AI-altered text, code or images using the shadcn switch in the post composer. The label appears before the content in the feed, post detail and public profile previews. Public post metadata also identifies declared AI posts. Authors can change their declaration on the post detail page after publishing.

The label is a declaration by the author, not an automated detector or independent verification. Unmarked posts are not described as human-written. Existing posts remain unmarked until their author changes the setting. Basic spelling correction alone is not the intended use of the switch.

`posts.is_ai_generated` is a non-null boolean, default false. `set_post_ai_generated(uuid, boolean)` only changes that field, checks the authenticated author and rejects banned accounts. No broader post-update permission is granted. Feed and detail caches are updated after a successful save. Errors preserve the previous setting and the composer draft.

Apply `supabase/migrations/20261021180000_post_ai_disclosure.sql` before deploying the new application. The migration adds a field and a narrowly scoped function; it does not change post content or guess historical declarations.

The migration was applied to the linked Supabase project with explicit approval on 21 October 2026. Verification confirmed the function body, restricted execution grants, empty search path, non-null boolean/default and matching migration history. No live posts were used for mutation tests.

The visible label also has a `data-ai-generated` attribute for DOM consumers. This attribute is not a watermark, a content credential or evidence of compliance with technical provenance requirements.

## EU AI Act review

- Article 50 distinguishes several obligations: notifying people about direct interaction with AI, machine-readable marking by providers of generative systems, and disclosures for certain uses of generated content. A platform hosting user posts is not automatically the provider of the AI system that created them.
- For deployers, disclosure concerns deepfakes and AI-generated or manipulated text informing the public on matters of public interest. Scope, professional versus personal use, and the exception for human review or editorial control with editorial responsibility matter. Our product option is broader and also allows disclosure of AI-generated programming content.
- A disclosure must be clear, distinguishable and accessible at first exposure. We show text before the post body; readers do not need to open a menu or tooltip.
- Provider marking obligations are separate. If ScripticX later integrates an AI generator, this author-controlled switch alone will not satisfy those obligations. That integration needs provenance measures suitable for its outputs, and its own review of applicable exceptions and dates.
- The source review found no direct AI chatbot or model-provider integration in the inspected application routes. This is not a review of external services, contracts or staff practices. If such an integration is introduced, disclose AI interaction at its entry point and assess data handling and output marking.
- Article 4 AI literacy is an organizational responsibility where ScripticX acts as a provider or deployer; a UI switch does not train staff. Document appropriate training and operating guidance if AI systems are used professionally.
- Do not claim that this feature makes ScripticX “AI Act compliant”. Any future AI-based student assessment, access decision or grading feature needs a separate assessment, including education-related high-risk use cases. No such classification is decided by this post-label implementation.

Remaining operational decisions: publication/moderation guidance for misleading unmarked AI content, applicable organizational roles, and any provenance requirements for actual AI integrations. No new detector, report category, legal terms or moderation enforcement is silently introduced here.

## Primary sources

- [European Commission: Article 50 transparency FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [AI Act Service Desk: Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50)
- [European Commission: AI literacy, Article 4](https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers)
- [AI Act Service Desk: Annex III](https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3)

Check the current consolidated law and applicability dates for the specific system and operator before making a legal compliance claim.
