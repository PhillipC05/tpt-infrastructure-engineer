"""
Multi-provider AI engine for TPT Infrastructure Engineer.
Provider is selected via AI_PROVIDER env var. Entirely optional — falls back gracefully.

Supported providers:
  anthropic   — Claude models via the Anthropic SDK (AI_MODEL default: claude-sonnet-4-6)
  grok        — xAI Grok via REST API            (AI_MODEL default: grok-3)
  openrouter  — OpenRouter proxy via REST API     (AI_MODEL default: anthropic/claude-sonnet-4-6)
"""

import os
import logging
from typing import Optional

AI_PROVIDER = os.getenv("AI_PROVIDER", "").lower().strip()
AI_API_KEY = os.getenv("AI_API_KEY", "").strip()
AI_MODEL = os.getenv("AI_MODEL", "").strip()

_PROVIDER_DEFAULTS: dict[str, str] = {
    "anthropic": "claude-sonnet-4-6",
    "grok": "grok-3",
    "openrouter": "anthropic/claude-sonnet-4-6",
}

_SYSTEM_PROMPTS: dict[str, str] = {
    "engineering_assistant": (
        "You are an expert civil and infrastructure engineer assistant. "
        "Provide precise, technically accurate guidance. Cite AS/NZS standards where applicable. "
        "Be concise and practical."
    ),
    "cost_estimation": (
        "You are an expert infrastructure cost estimator. "
        "Provide detailed breakdowns, unit rates, and contingency recommendations based on current NZ/AU market rates."
    ),
    "compliance_check": (
        "You are a compliance specialist for civil infrastructure. "
        "Assess designs against AS/NZS standards and return clear pass/fail determinations with remediation steps."
    ),
    "procurement": (
        "You are an infrastructure procurement specialist. "
        "Help draft purchase orders, evaluate suppliers, and flag supply-chain risks for NZ infrastructure projects."
    ),
}


class AIEngine:
    def __init__(self) -> None:
        self.provider: str = AI_PROVIDER if (AI_PROVIDER and AI_API_KEY) else ""
        self.api_key: str = AI_API_KEY
        self.model: str = AI_MODEL or _PROVIDER_DEFAULTS.get(self.provider, "")

    @property
    def is_enabled(self) -> bool:
        return bool(self.provider and self.api_key)

    @property
    def provider_label(self) -> str:
        labels = {"anthropic": "Anthropic (Claude)", "grok": "xAI (Grok)", "openrouter": "OpenRouter"}
        return labels.get(self.provider, self.provider)

    async def generate(self, prompt: str, template_name: str = "engineering_assistant") -> str:
        if not self.is_enabled:
            raise NotImplementedError(
                "No AI provider configured. Set AI_PROVIDER and AI_API_KEY in .env."
            )
        system_prompt = _SYSTEM_PROMPTS.get(template_name, _SYSTEM_PROMPTS["engineering_assistant"])
        if self.provider == "anthropic":
            return await self._anthropic(prompt, system_prompt)
        if self.provider == "grok":
            return await self._openai_compat(
                prompt, system_prompt,
                base_url="https://api.x.ai/v1",
                model=self.model or "grok-3",
            )
        if self.provider == "openrouter":
            return await self._openai_compat(
                prompt, system_prompt,
                base_url="https://openrouter.ai/api/v1",
                model=self.model or "anthropic/claude-sonnet-4-6",
                extra_headers={
                    "HTTP-Referer": "https://tptengineer.com",
                    "X-Title": "TPT Infrastructure Engineer",
                },
            )
        raise NotImplementedError(f"Unknown AI provider: {self.provider!r}. Use 'anthropic', 'grok', or 'openrouter'.")

    async def _anthropic(self, prompt: str, system_prompt: str) -> str:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("anthropic package not installed. Run: pip install anthropic")
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        message = await client.messages.create(
            model=self.model or "claude-sonnet-4-6",
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def _openai_compat(
        self,
        prompt: str,
        system_prompt: str,
        base_url: str,
        model: str,
        extra_headers: Optional[dict] = None,
    ) -> str:
        try:
            import httpx
        except ImportError:
            raise RuntimeError("httpx package not installed. Run: pip install httpx")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if extra_headers:
            headers.update(extra_headers)
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 2048,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]


ai_engine = AIEngine()
