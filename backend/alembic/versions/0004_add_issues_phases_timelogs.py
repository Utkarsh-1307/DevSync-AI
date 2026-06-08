"""Add issues, phases, and time_logs tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- phases ---
    op.create_table(
        "phases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.Enum("planned", "active", "completed", name="phasestatus"), nullable=False, server_default="planned"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_phases_workspace_id", "phases", ["workspace_id"])
    op.create_index("ix_phases_project_id", "phases", ["project_id"])

    # --- add phase_id to tasks ---
    op.add_column(
        "tasks",
        sa.Column("phase_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("phases.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_tasks_phase_id", "tasks", ["phase_id"])

    # --- issues ---
    op.create_table(
        "issues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.Enum("open", "in_progress", "resolved", "closed", name="issuestatus"), nullable=False, server_default="open"),
        sa.Column("priority", sa.Enum("critical", "high", "medium", "low", name="issuepriority"), nullable=False, server_default="medium"),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_issues_workspace_id", "issues", ["workspace_id"])
    op.create_index("ix_issues_project_id", "issues", ["project_id"])
    op.create_index("ix_issues_status", "issues", ["status"])
    op.create_index("ix_issues_assignee_id", "issues", ["assignee_id"])

    # --- issue_labels ---
    op.create_table(
        "issue_labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("issue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("issues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6366f1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("issue_id", "name", name="uq_issue_label"),
    )
    op.create_index("ix_issue_labels_issue_id", "issue_labels", ["issue_id"])

    # --- time_logs ---
    op.create_table(
        "time_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("hours", sa.Float, nullable=False),
        sa.Column("logged_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_time_logs_workspace_id", "time_logs", ["workspace_id"])
    op.create_index("ix_time_logs_task_id", "time_logs", ["task_id"])
    op.create_index("ix_time_logs_user_id", "time_logs", ["user_id"])
    op.create_index("ix_time_logs_logged_date", "time_logs", ["logged_date"])


def downgrade() -> None:
    op.drop_index("ix_time_logs_logged_date", table_name="time_logs")
    op.drop_index("ix_time_logs_user_id", table_name="time_logs")
    op.drop_index("ix_time_logs_task_id", table_name="time_logs")
    op.drop_index("ix_time_logs_workspace_id", table_name="time_logs")
    op.drop_table("time_logs")

    op.drop_index("ix_issue_labels_issue_id", table_name="issue_labels")
    op.drop_table("issue_labels")

    op.drop_index("ix_issues_assignee_id", table_name="issues")
    op.drop_index("ix_issues_status", table_name="issues")
    op.drop_index("ix_issues_project_id", table_name="issues")
    op.drop_index("ix_issues_workspace_id", table_name="issues")
    op.drop_table("issues")

    op.drop_index("ix_tasks_phase_id", table_name="tasks")
    op.drop_column("tasks", "phase_id")

    op.drop_index("ix_phases_project_id", table_name="phases")
    op.drop_index("ix_phases_workspace_id", table_name="phases")
    op.drop_table("phases")

    op.execute("DROP TYPE IF EXISTS phasestatus")
    op.execute("DROP TYPE IF EXISTS issuestatus")
    op.execute("DROP TYPE IF EXISTS issuepriority")
