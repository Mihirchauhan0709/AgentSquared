"""
Agent template definitions.

Each template describes:
  - The form fields the frontend should render
  - The base system prompt / spec skeleton used by Gemini
  - The knowledge strategy (rag vs context_injection)
"""

from schemas.agent import TemplateInfo, TemplateField

TEMPLATES: dict[str, dict] = {
    "support_qa": {
        "label": "Customer Support / Q&A Agent",
        "description": "Answer customer questions grounded in your company's knowledge base.",
        "fields": [
            TemplateField(
                name="tone",
                label="Support Tone",
                type="text",
                placeholder="e.g. friendly and professional",
            ),
            TemplateField(
                name="policies",
                label="Key Policies",
                type="textarea",
                placeholder="e.g. 30-day returns, support hours 9-5 EST",
            ),
            TemplateField(
                name="context",
                label="Additional Business Context",
                type="textarea",
                placeholder="e.g. Most common issues: shipping delays, password resets",
                required=False,
            ),
        ],
        "knowledge_strategy": "rag",
        "spec_skeleton": {
            "version": "1",
            "agent_type": "support_qa",
            "identity": {"name": "", "greeting": ""},
            "behavior": {
                "system_prompt": "",
                "response_style": "concise, cites sources when available",
                "guardrails": [
                    "Only answer questions related to the company",
                    "If unsure, say you don't know and offer to escalate",
                    "Be polite and professional at all times",
                ],
            },
            "starter_prompts": [],
            "knowledge_config": {
                "strategy": "rag",
                "retrieval_instruction": "Search uploaded docs first. Cite the source filename when using uploaded content.",
            },
        },
    },
    "social_marketing": {
        "label": "Social Media Marketing Agent",
        "description": "Generate LinkedIn posts, content ideas, and copy variations for your brand.",
        "fields": [
            TemplateField(
                name="audience",
                label="Target Audience",
                type="text",
                placeholder="e.g. B2B SaaS decision-makers",
            ),
            TemplateField(
                name="goals",
                label="Marketing Goals",
                type="textarea",
                placeholder="e.g. Increase brand awareness, drive demo signups",
            ),
            TemplateField(
                name="brand_tone",
                label="Brand Tone",
                type="text",
                placeholder="e.g. bold, witty, thought-leader",
            ),
        ],
        "knowledge_strategy": "context_injection",
        "spec_skeleton": {
            "version": "1",
            "agent_type": "social_marketing",
            "identity": {"name": "", "greeting": ""},
            "behavior": {
                "system_prompt": "",
                "response_style": "creative, punchy, uses emojis sparingly",
                "guardrails": [
                    "Stay on-brand with the described tone",
                    "Do not generate offensive or controversial content",
                    "Focus on LinkedIn-style professional content",
                ],
            },
            "starter_prompts": [],
            "knowledge_config": {
                "strategy": "context_injection",
                "retrieval_instruction": "Use the business context provided in the system prompt.",
            },
        },
    },
}


def get_template(agent_type: str) -> dict:
    """Get template config by agent_type. Raises KeyError if invalid."""
    return TEMPLATES[agent_type]


def get_all_templates() -> list[TemplateInfo]:
    """Return template metadata for the frontend."""
    result = []
    for agent_type, tpl in TEMPLATES.items():
        result.append(
            TemplateInfo(
                agent_type=agent_type,
                label=tpl["label"],
                description=tpl["description"],
                fields=tpl["fields"],
            )
        )
    return result
