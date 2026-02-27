import uuid
import logging
from typing import Optional
from agno.agent import Agent
from agent.tools.instagram_tools import InstagramToolkit
from agent.prompts import AGENT_INSTRUCTIONS

logger = logging.getLogger(__name__)

# Cache the agent instance
_agent: Optional[Agent] = None
_agent_config_hash: Optional[str] = None


def _config_hash(config: dict) -> str:
    """Generate a hash to detect config changes."""
    keys = ["llm_provider", "llm_api_key", "llm_model"]
    return "|".join(str(config.get(k, "")) for k in keys)


def _get_model(provider: str, api_key: str, model_id: str):
    """Create the LLM model based on provider."""
    if provider == "groq":
        from agno.models.groq import Groq
        return Groq(id=model_id, api_key=api_key)
    elif provider == "anthropic":
        from agno.models.anthropic import Claude
        return Claude(id=model_id, api_key=api_key)
    else:
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=model_id, api_key=api_key)


def get_agent(config: dict = None) -> Agent:
    """Get or create the Agno Agent instance."""
    global _agent, _agent_config_hash

    if config is None:
        from services.config_service import get_config
        config = get_config()

    current_hash = _config_hash(config)

    # Return cached agent if config hasn't changed
    if _agent and _agent_config_hash == current_hash:
        return _agent

    provider = config.get("llm_provider", "groq")
    api_key = config.get("llm_api_key", "")
    model_id = config.get("llm_model", "llama-3.3-70b-versatile")

    if not api_key:
        raise ValueError(
            f"LLM API key not configured. Please set your {provider} API key in Settings."
        )

    model = _get_model(provider, api_key, model_id)

    _agent = Agent(
        name="Instagram AI Agent",
        model=model,
        tools=[InstagramToolkit()],
        instructions=AGENT_INSTRUCTIONS,
        markdown=True,
        show_tool_calls=True,
        add_datetime_to_instructions=True,
    )

    _agent_config_hash = current_hash
    logger.info(f"Agent created with {provider}/{model_id}")
    return _agent


def chat_with_agent(message: str, session_id: str = None) -> dict:
    """Send a message to the agent and get a response."""
    if not session_id:
        session_id = str(uuid.uuid4())

    agent = get_agent()

    response = agent.run(message, session_id=session_id)

    response_text = ""
    if response and response.content:
        response_text = response.content

    return {
        "response": response_text,
        "session_id": session_id,
    }


def generate_greeting(username: str) -> str:
    """Use the agent to generate a personalized greeting for a new follower."""
    try:
        agent = get_agent()
        response = agent.run(
            f"Gere uma mensagem curta e amigavel de boas-vindas para o novo seguidor @{username}. "
            f"A mensagem deve ser calorosa, em portugues brasileiro, e ter no maximo 2 frases. "
            f"Nao use hashtags. Apenas retorne a mensagem, sem explicacoes."
        )
        if response and response.content:
            return response.content.strip()
    except Exception as e:
        logger.error(f"Error generating greeting: {e}")

    # Fallback to template
    import random
    from agent.prompts import GREETING_TEMPLATES
    return random.choice(GREETING_TEMPLATES)


def generate_like_comment(username: str, media_caption: str) -> str:
    """Use the agent to generate a contextual comment about a liked photo."""
    try:
        agent = get_agent()
        caption_info = f" com a legenda: '{media_caption}'" if media_caption else ""
        response = agent.run(
            f"@{username} curtiu uma postagem nossa{caption_info}. "
            f"Gere um comentario amigavel e contextual sobre a postagem. "
            f"Algo como 'voce gostou dessa nossa postagem, olha essa que legal tambem!'. "
            f"Maximo 2 frases, em portugues brasileiro. Sem hashtags. Apenas retorne o comentario."
        )
        if response and response.content:
            return response.content.strip()
    except Exception as e:
        logger.error(f"Error generating like comment: {e}")

    # Fallback to template
    import random
    from agent.prompts import LIKE_COMMENT_TEMPLATES
    return random.choice(LIKE_COMMENT_TEMPLATES)
