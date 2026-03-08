"""
Gemini service: generate a structured agent spec from form inputs + template.
"""

import json
from google import genai
from config import settings
from templates.agent_templates import get_template


client = genai.Client(api_key=settings.GEMINI_API_KEY)


SPEC_GEN_PROMPT = """You are Agent Squared, an AI system that generates agent configuration specs.

Given the following inputs about a business agent, generate a complete JSON agent spec.

Agent Type: {agent_type}
Agent Name: {name}
Business Description: {description}
Template Base Config: {template_skeleton}
User-Provided Config:
{config_input}

Generate a JSON object with this exact structure:
{{
  "version": "1",
  "agent_type": "{agent_type}",
  "identity": {{
    "name": "<agent name>",
    "greeting": "<a friendly, on-brand greeting for end users>"
  }},
  "behavior": {{
    "system_prompt": "<detailed system prompt that instructs the agent how to behave, using all the context above>",
    "response_style": "<concise description of how responses should be styled>",
    "guardrails": ["<list of behavioral guardrails>"]
  }},
  "starter_prompts": ["<3-5 example questions/prompts users might ask>"],
  "knowledge_config": {{
    "strategy": "{knowledge_strategy}",
    "retrieval_instruction": "<instruction for how to use knowledge>"
  }}
}}

Return ONLY valid JSON, no markdown fences, no explanation."""


async def generate_agent_spec(
    agent_type: str,
    name: str,
    description: str,
    config_input: dict,
) -> dict:
    """Call Gemini to generate a structured agent spec."""
    template = get_template(agent_type)

    prompt = SPEC_GEN_PROMPT.format(
        agent_type=agent_type,
        name=name,
        description=description,
        template_skeleton=json.dumps(template["spec_skeleton"], indent=2),
        config_input=json.dumps(config_input, indent=2),
        knowledge_strategy=template["knowledge_strategy"],
    )

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )

    # Parse the JSON response
    text = response.text.strip()
    # Strip markdown fences if Gemini adds them
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    try:
        spec = json.loads(text)
    except json.JSONDecodeError:
        # Fallback: use template skeleton with basic overrides
        spec = template["spec_skeleton"].copy()
        spec["identity"]["name"] = name
        spec["identity"]["greeting"] = f"Hi! I'm {name}. How can I help you today?"
        spec["behavior"]["system_prompt"] = (
            f"You are {name}. {description}. "
            f"Additional context: {json.dumps(config_input)}"
        )
        spec["starter_prompts"] = ["How can you help me?", "Tell me about your services."]

    return spec
