import re
from uuid import UUID

import anthropic

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def get_anthropic_client() -> anthropic.AsyncAnthropic | None:
    global _client
    if not settings.ANTHROPIC_API_KEY:
        return None
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


class BuiltinAssistant:
    """Workspace-aware assistant that works without an external API key."""

    def answer(
        self,
        question: str,
        workspace_name: str,
        workspace_data: dict,
    ) -> str:
        q = question.lower().strip()
        tasks = workspace_data.get("tasks", [])
        projects = workspace_data.get("projects", [])
        channels = workspace_data.get("channels", [])

        # Greeting
        if re.search(r"\b(hi|hello|hey|sup|yo)\b", q):
            return (
                f"Hey! I'm the DevSync AI assistant for **{workspace_name}**.\n\n"
                f"Your workspace has **{len(projects)} project(s)**, "
                f"**{len(channels)} channel(s)**, and **{len(tasks)} task(s)**.\n\n"
                "Ask me things like:\n"
                "- *What tasks are in progress?*\n"
                "- *Show me my projects*\n"
                "- *How many tasks are done?*\n"
                "- *What should I work on?*"
            )

        # Task status breakdown
        if re.search(r"\b(task|tasks|todo|backlog|work)\b", q):
            if not tasks:
                return "No tasks yet. Go to a project and click **+ Add task** on any Kanban column to create one."

            by_status: dict[str, list] = {}
            for t in tasks:
                s = t.get("status", "unknown")
                by_status.setdefault(s, []).append(t["title"])

            if re.search(r"\b(progress|doing|active|current)\b", q):
                items = by_status.get("in_progress", [])
                if not items:
                    return "No tasks are currently in progress."
                return "**In Progress:**\n" + "\n".join(f"• {t}" for t in items)

            if re.search(r"\b(done|finished|completed|complete)\b", q):
                items = by_status.get("done", [])
                if not items:
                    return "No tasks marked as done yet."
                return f"**Done ({len(items)}):**\n" + "\n".join(f"✓ {t}" for t in items)

            if re.search(r"\b(todo|to.do|to do|planned|next)\b", q):
                items = by_status.get("todo", [])
                if not items:
                    return "No tasks in the To Do column."
                return "**To Do:**\n" + "\n".join(f"• {t}" for t in items)

            # Full breakdown
            lines = [f"**Task summary for {workspace_name}** ({len(tasks)} total)\n"]
            order = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]
            labels = {
                "backlog": "📋 Backlog", "todo": "🔵 To Do", "in_progress": "🟡 In Progress",
                "in_review": "🟣 In Review", "done": "✅ Done", "cancelled": "❌ Cancelled",
            }
            for s in order:
                items = by_status.get(s, [])
                if items:
                    lines.append(f"{labels.get(s, s)}: {len(items)}")
                    for t in items[:3]:
                        lines.append(f"  • {t}")
                    if len(items) > 3:
                        lines.append(f"  … and {len(items) - 3} more")
            return "\n".join(lines)

        # Projects
        if re.search(r"\b(project|projects)\b", q):
            if not projects:
                return "No projects yet. Click **+** next to PROJECTS in the sidebar to create one."
            lines = [f"**Projects in {workspace_name}:**"]
            for p in projects:
                task_count = sum(1 for t in tasks if t.get("project_id") == p.get("id"))
                lines.append(f"• **{p['name']}** ({p.get('key', '?')}) — {task_count} tasks")
            return "\n".join(lines)

        # Channels
        if re.search(r"\b(channel|channels|chat|message|messages)\b", q):
            if not channels:
                return "No channels yet. Click **+** next to CHANNELS in the sidebar to create one."
            lines = [f"**Channels in {workspace_name}:**"]
            for c in channels:
                lines.append(f"• #{c['name']}" + (f" — {c['description']}" if c.get("description") else ""))
            return "\n".join(lines)

        # What should I work on?
        if re.search(r"\b(should|recommend|suggest|priority|important|urgent)\b", q):
            high = [t for t in tasks if t.get("priority") in ("critical", "high") and t.get("status") not in ("done", "cancelled")]
            in_prog = [t for t in tasks if t.get("status") == "in_progress"]
            todos = [t for t in tasks if t.get("status") == "todo"]

            lines = [f"**Recommended focus for {workspace_name}:**\n"]
            if in_prog:
                lines.append("🟡 **Finish what's in progress first:**")
                for t in in_prog[:3]:
                    lines.append(f"  • {t['title']}")
            if high:
                lines.append("\n🔴 **High priority tasks:**")
                for t in high[:3]:
                    lines.append(f"  • {t['title']} ({t.get('status', '?')})")
            if todos and not in_prog and not high:
                lines.append("🔵 **Next up:**")
                for t in todos[:3]:
                    lines.append(f"  • {t['title']}")
            if not in_prog and not high and not todos:
                lines.append("Everything looks clear! Add tasks to your projects to get started.")
            return "\n".join(lines)

        # Workspace / general help
        if re.search(r"\b(workspace|how|help|what can|feature|use)\b", q):
            return (
                f"**DevSync AI — {workspace_name}**\n\n"
                "Here's what you can do:\n\n"
                "📁 **Projects** — Create projects, manage tasks on the Kanban board\n"
                "💬 **Channels** — Team chat with real-time messaging\n"
                "🔔 **Notifications** — Stay updated on task changes\n"
                "🤖 **AI Assistant** — That's me! Ask about tasks, projects, or workspace stats\n\n"
                f"Current stats: **{len(projects)}** projects · **{len(channels)}** channels · **{len(tasks)}** tasks"
            )

        # Fallback
        return (
            f"I'm the DevSync AI for **{workspace_name}**. "
            f"You have {len(tasks)} tasks across {len(projects)} projects.\n\n"
            "Try asking:\n"
            "• *What tasks are in progress?*\n"
            "• *Show my projects*\n"
            "• *What should I work on?*\n"
            "• *How many tasks are done?*"
        )


class AIService:
    MODEL = settings.DEFAULT_AI_MODEL
    MAX_TOKENS = settings.AI_MAX_TOKENS
    _builtin = BuiltinAssistant()

    async def summarize_task(self, title: str, description: str, comments: list[str]) -> str:
        client = get_anthropic_client()
        if client is None:
            desc = description[:200] if description else "No description provided."
            return f"**{title}**\n\n{desc}" + (f"\n\nComments: {len(comments)}" if comments else "")
        prompt = (
            f"Summarize the following task for a project manager in 2-3 sentences.\n\n"
            f"Title: {title}\nDescription: {description}\n"
            f"Comments:\n" + "\n".join(f"- {c}" for c in comments)
        )
        return await self._complete(client, prompt)

    async def suggest_task_description(self, title: str, project_context: str) -> str:
        client = get_anthropic_client()
        if client is None:
            return f"Implement {title} for the {project_context} project. Define acceptance criteria and break down into subtasks as needed."
        prompt = (
            f"You are a software project assistant. Write a clear, actionable task description "
            f"for the following task title in a project called '{project_context}'.\n\n"
            f"Task title: {title}\n\nDescription:"
        )
        return await self._complete(client, prompt)

    async def generate_standup(
        self, user_tasks: list[dict], yesterday: list[dict], blockers: list[str]
    ) -> str:
        client = get_anthropic_client()
        done = [t["title"] for t in yesterday if t.get("status") == "done"]
        today = [t["title"] for t in user_tasks if t.get("status") in ("in_progress", "todo")]
        if client is None:
            parts = []
            if done:
                parts.append("Yesterday I completed: " + ", ".join(done) + ".")
            if today:
                parts.append("Today I plan to work on: " + ", ".join(today) + ".")
            if blockers:
                parts.append("Blockers: " + ", ".join(blockers) + ".")
            return " ".join(parts) if parts else "No updates today."
        prompt = (
            "Generate a concise daily standup update from this data:\n\n"
            f"Yesterday completed: {', '.join(done) or 'nothing'}\n"
            f"Today planned: {', '.join(today) or 'nothing'}\n"
            f"Blockers: {', '.join(blockers) or 'none'}\n\n"
            "Write in first person, natural tone, max 100 words."
        )
        return await self._complete(client, prompt)

    async def answer_question(
        self,
        question: str,
        workspace_context: str,
        history: list[dict] | None = None,
        workspace_data: dict | None = None,
    ) -> str:
        client = get_anthropic_client()
        if client is None:
            return self._builtin.answer(question, workspace_context, workspace_data or {})

        messages: list[dict] = []
        if history:
            messages.extend(history[-10:])
        messages.append({"role": "user", "content": question})

        system = (
            f"You are DevSync AI, an intelligent assistant embedded in a project management "
            f"and team collaboration platform called DevSync. "
            f"Workspace: {workspace_context}. "
            "Be concise, professional, and actionable. Use markdown for formatting."
        )
        if workspace_data:
            tasks = workspace_data.get("tasks", [])
            projects = workspace_data.get("projects", [])
            channels = workspace_data.get("channels", [])
            system += (
                f"\n\nCurrent workspace data: {len(tasks)} tasks, "
                f"{len(projects)} projects ({', '.join(p['name'] for p in projects)}), "
                f"{len(channels)} channels."
            )

        response = await client.messages.create(
            model=self.MODEL,
            max_tokens=self.MAX_TOKENS,
            system=system,
            messages=messages,
        )
        return response.content[0].text

    @staticmethod
    async def _complete(client: anthropic.AsyncAnthropic, prompt: str) -> str:
        response = await client.messages.create(
            model=settings.DEFAULT_AI_MODEL,
            max_tokens=settings.AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
