"""AI engine stub. Raises NotImplementedError so the caller's try/except returns a clean 503."""


class AIEngine:
    async def generate(self, prompt: str, template_name: str = "engineering_assistant") -> str:
        raise NotImplementedError(
            "AI provider not configured. Set AI_ENABLED=true and configure an AI_API_KEY in .env."
        )


ai_engine = AIEngine()
