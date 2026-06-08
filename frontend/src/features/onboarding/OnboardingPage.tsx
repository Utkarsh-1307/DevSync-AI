import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useCreateWorkspace } from "@/features/workspace/hooks";
import { workspaceApi } from "@/features/workspace/api";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

const TOTAL_STEPS = 3;

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i < step ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createWorkspace = useCreateWorkspace();

  const [step, setStep] = useState(1);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceDesc, setWorkspaceDesc] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [wsError, setWsError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const handleNameChange = (val: string) => {
    setWorkspaceName(val);
    setWorkspaceSlug(
      val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 32)
    );
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) { setWsError("Workspace name is required"); return; }
    if (!workspaceSlug.trim()) { setWsError("Slug is required"); return; }
    setWsError(null);
    try {
      const ws = await createWorkspace.mutateAsync({
        name: workspaceName.trim(),
        slug: workspaceSlug.trim(),
        description: workspaceDesc.trim() || undefined,
      });
      setWorkspaceId(ws.id);
      setStep(3);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setWsError(msg ?? "Failed to create workspace");
    }
  };

  const handleInviteAndFinish = async () => {
    if (!workspaceId) return;
    const emails = inviteEmails.split(",").map((e) => e.trim()).filter(Boolean);
    if (emails.length > 0) {
      setInviteLoading(true);
      try {
        await Promise.allSettled(
          emails.map((email) => workspaceApi.inviteMember(workspaceId, email, "member"))
        );
      } finally {
        setInviteLoading(false);
      }
    }
    navigate(`/w/${workspaceId}`, { replace: true });
  };

  const handleSkip = () => {
    if (workspaceId) navigate(`/w/${workspaceId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">D</div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">DevSync AI</span>
          </div>
          <span className="text-xs text-gray-400">Step {step} of {TOTAL_STEPS}</span>
        </div>

        <ProgressBar step={step} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-2xl font-bold text-brand-600">
                  {firstName[0]?.toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome, {firstName}!
                </h2>
                <p className="text-gray-500 text-sm">
                  You're just a few steps away from your new workspace. Let's get you set up.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-8 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {[
                  { icon: "💬", text: "Real-time channels and DMs" },
                  { icon: "✅", text: "Kanban task boards" },
                  { icon: "🤖", text: "Built-in AI assistant" },
                  { icon: "📎", text: "File and image sharing" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={() => setStep(2)}>
                Let's set up your workspace →
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Create your workspace
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                A workspace is where your team collaborates. Give it a name.
              </p>

              <div className="space-y-4">
                <Input
                  label="Workspace Name"
                  placeholder="Acme Corp"
                  value={workspaceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                <Input
                  label="Slug (used in URLs)"
                  placeholder="acme-corp"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What does your team work on?"
                    value={workspaceDesc}
                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                {wsError && (
                  <p className="text-sm text-red-500">{wsError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← Back
                  </button>
                  <Button
                    className="flex-1"
                    loading={createWorkspace.isPending}
                    onClick={handleCreateWorkspace}
                  >
                    Create Workspace →
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace created!</h2>
                  <p className="text-sm text-gray-500">Invite your teammates to get started</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invite by email <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="alice@company.com, bob@company.com"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <Button
                  className="w-full"
                  loading={inviteLoading}
                  onClick={handleInviteAndFinish}
                >
                  {inviteEmails.trim() ? "Send invites & go to workspace →" : "Go to my workspace →"}
                </Button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
