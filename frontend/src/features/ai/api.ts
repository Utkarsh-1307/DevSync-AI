import api from "@/lib/api";

interface AITextResponse {
  result: string;
}

export const aiApi = {
  summarizeTask: (workspaceId: string, title: string, description: string, comments: string[]) =>
    api
      .post<AITextResponse>(`/workspaces/${workspaceId}/ai/summarize-task`, {
        title,
        description,
        comments,
      })
      .then((r) => r.data.result),

  suggestDescription: (workspaceId: string, title: string, projectName: string) =>
    api
      .post<AITextResponse>(`/workspaces/${workspaceId}/ai/suggest-description`, {
        title,
        project_name: projectName,
      })
      .then((r) => r.data.result),

  generateStandup: (
    workspaceId: string,
    tasks: object[],
    yesterdayTasks: object[],
    blockers: string[]
  ) =>
    api
      .post<AITextResponse>(`/workspaces/${workspaceId}/ai/standup`, {
        tasks,
        yesterday_tasks: yesterdayTasks,
        blockers,
      })
      .then((r) => r.data.result),

  chat: (
    workspaceId: string,
    question: string,
    history?: Array<{ role: string; content: string }>,
    workspaceName?: string
  ) =>
    api
      .post<AITextResponse>(`/workspaces/${workspaceId}/ai/chat`, {
        question,
        history,
        workspace_name: workspaceName,
      })
      .then((r) => r.data.result),
};
