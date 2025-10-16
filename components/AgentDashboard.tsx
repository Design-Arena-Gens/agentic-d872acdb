/* eslint-disable react/no-unescaped-entities */
"use client";

import { useMemo, useState } from "react";
import clsx from "classnames";
import { runAgent, defaultCategories, classifyEmail } from "../lib/agent";
import { sampleEmails } from "../lib/sample-data";
import type { Category, Classification, Email } from "../lib/types";

type TabKey = "overview" | "composer";

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `email-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyEmail: Omit<Email, "id"> = {
  sender: "",
  subject: "",
  body: "",
  receivedAt: new Date().toISOString(),
  importance: "normal",
  tags: []
};

export function AgentDashboard() {
  const [categories] = useState<Category[]>(defaultCategories);
  const [emails, setEmails] = useState<Email[]>(sampleEmails);
  const [{ classifications, summary }, setAgentState] = useState(() =>
    runAgent(sampleEmails, categories)
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [composer, setComposer] = useState(emptyEmail);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const filteredEmails = useMemo(() => {
    if (filterCategory === "all") return emails;
    const filteredIds = new Set(
      classifications
        .filter((classification) => classification.categoryId === filterCategory)
        .map((classification) => classification.emailId)
    );
    return emails.filter((email) => filteredIds.has(email.id));
  }, [emails, classifications, filterCategory]);

  const classificationByEmail = useMemo(() => {
    return classifications.reduce<Record<string, Classification>>(
      (acc, classification) => {
        acc[classification.emailId] = classification;
        return acc;
      },
      {}
    );
  }, [classifications]);

  const selectedEmail =
    selectedEmailId !== null
      ? emails.find((email) => email.id === selectedEmailId)
      : filteredEmails[0];

  const selectedClassification =
    selectedEmail && classificationByEmail[selectedEmail.id];

  const syncAgent = (nextEmails: Email[]) => {
    setEmails(nextEmails);
    setAgentState(runAgent(nextEmails, categories));
  };

  const handleRefresh = () => {
    syncAgent(emails);
  };

  const handleImportanceToggle = (value: Email["importance"]) => {
    setComposer((prev) => ({ ...prev, importance: value }));
  };

  const handleComposerChange = (
    field: keyof Omit<Email, "id">
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setComposer((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagInput = (value: string) => {
    setComposer((prev) => ({
      ...prev,
      tags: value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    }));
  };

  const resetComposer = () => {
    setComposer({
      ...emptyEmail,
      receivedAt: new Date().toISOString()
    });
  };

  const handleCreateEmail = () => {
    if (!composer.sender || !composer.subject || !composer.body) {
      return;
    }

    const newEmail: Email = {
      ...composer,
      id: createId(),
      receivedAt: composer.receivedAt || new Date().toISOString()
    };

    const nextEmails = [newEmail, ...emails];
    syncAgent(nextEmails);
    setSelectedEmailId(newEmail.id);
    resetComposer();
    setActiveTab("overview");
  };

  const handleQuickClassify = (email: Email) => {
    const result = classifyEmail(email, categories);
    setSelectedEmailId(email.id);
    alert(
      [
        `Predicted category: ${categories.find(
          (category) => category.id === result.categoryId
        )?.name ?? result.categoryId}`,
        `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
        result.matchedKeywords.length > 0
          ? `Keywords: ${result.matchedKeywords.join(", ")}`
          : "Keywords: —",
        result.matchedSenders.length > 0
          ? `Sender signals: ${result.matchedSenders.join(", ")}`
          : "Sender signals: —"
      ].join("\n")
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
          Autonomous Agent
        </span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-slate-50 sm:text-5xl">
              Inbox Sorting Intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Evaluate each message, explain routing decisions, and surface high
              priority threads before they get buried. Import emails or compose a
              scenario and let the agent justify its classification strategy.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center rounded-lg border border-sky-400/40 bg-slate-900 px-4 py-3 text-sm font-medium text-sky-200 transition hover:border-sky-400 hover:text-sky-50"
          >
            Re-run Agent
          </button>
        </div>
        <nav className="flex gap-2">
          {(
            [
              { key: "overview", label: "Agent Overview" },
              { key: "composer", label: "Compose Scenario" }
            ] satisfies { key: TabKey; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "rounded-full px-4 py-2 text-sm transition",
                activeTab === tab.key
                  ? "bg-sky-500/20 text-sky-100"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <section
        className={clsx(
          "grid grid-cols-1 gap-6 transition-opacity duration-200",
          activeTab === "overview" ? "opacity-100" : "pointer-events-none hidden"
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {categories.map((category) => {
            const total = summary.totalsByCategory[category.id] ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setFilterCategory((current) =>
                    current === category.id ? "all" : category.id
                  );
                }}
                className={clsx(
                  "flex flex-col gap-2 rounded-xl border p-4 text-left transition",
                  category.color,
                  filterCategory === category.id
                    ? "ring-1 ring-sky-300"
                    : "hover:border-sky-400/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-300/70">
                    {category.name}
                  </span>
                  <span className="rounded-full bg-black/40 px-2 py-1 text-xs text-slate-100">
                    {total}
                  </span>
                </div>
                <p className="text-sm text-slate-100/90">{category.description}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/50">
            <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Message Queue
                </h2>
                <p className="text-xs text-slate-400">
                  Filter:{" "}
                  <span className="font-medium text-slate-200">
                    {filterCategory === "all"
                      ? "All categories"
                      : categories.find((category) => category.id === filterCategory)
                          ?.name ?? filterCategory}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  Confidence avg:{" "}
                  <span className="font-semibold text-slate-200">
                    {(summary.averageConfidence * 100).toFixed(0)}%
                  </span>
                </span>
                <span>
                  Review queue:{" "}
                  <span className="font-semibold text-amber-300">
                    {summary.flaggedForReview.length}
                  </span>
                </span>
              </div>
            </header>

            <div className="flex flex-col divide-y divide-slate-800/80">
              {filteredEmails.length === 0 && (
                <div className="px-5 py-16 text-center text-sm text-slate-400">
                  Nothing here. Add a scenario or switch filters to see messages.
                </div>
              )}
              {filteredEmails.map((email) => {
                const classification = classificationByEmail[email.id];
                const category =
                  classification &&
                  categories.find((cat) => cat.id === classification.categoryId);
                const flagged = summary.flaggedForReview.includes(email.id);

                return (
                  <article
                    key={email.id}
                    className={clsx(
                      "flex cursor-pointer flex-col gap-3 px-5 py-4 transition hover:bg-slate-800/60",
                      selectedEmailId === email.id && "bg-slate-800/60"
                    )}
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-1 flex-col">
                        <h3 className="text-sm font-medium text-slate-100 sm:text-base">
                          {email.subject}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {email.sender}
                        </span>
                      </div>
                      {category && (
                        <span
                          className={clsx(
                            "rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide",
                            category.color
                          )}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-300">
                      {email.body}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <time dateTime={email.receivedAt}>
                        {new Date(email.receivedAt).toLocaleString()}
                      </time>
                      <div className="flex items-center gap-2">
                        {classification && (
                          <span className="rounded-md bg-slate-900/60 px-2 py-1 text-[11px] text-sky-200">
                            {(classification.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {flagged && (
                          <span className="rounded-md bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200">
                            Review
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleQuickClassify(email);
                          }}
                          className="rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/60 hover:text-sky-100"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
            {selectedEmail && selectedClassification ? (
              <>
                <header className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Agent Explanation
                  </span>
                  <h2 className="text-xl font-semibold text-slate-50">
                    {selectedEmail.subject}
                  </h2>
                  <p className="text-sm text-slate-400">{selectedEmail.sender}</p>
                </header>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">
                    Confidence {(selectedClassification.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">
                    Category{" "}
                    {
                      categories.find(
                        (category) => category.id === selectedClassification.categoryId
                      )?.name
                    }
                  </span>
                  {summary.flaggedForReview.includes(selectedEmail.id) && (
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
                      Manual review recommended
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Agent reasoning
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {selectedClassification.reasoning.map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-2"
                      >
                        {item}
                      </li>
                    ))}
                    {selectedClassification.reasoning.length === 0 && (
                      <li className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-slate-400">
                        No explicit reasoning signals captured. Consider tuning
                        category heuristics.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2 text-sm text-slate-300">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Suggested actions
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {selectedClassification.suggestedActions.map((action) => (
                      <li
                        key={action}
                        className="rounded-md border border-slate-700/60 bg-slate-900/70 px-3 py-2"
                      >
                        {action}
                      </li>
                    ))}
                    {selectedClassification.suggestedActions.length === 0 && (
                      <li className="rounded-md border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-slate-400">
                        No automation mapped for this category yet.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-300">Keywords:</span>{" "}
                    {selectedClassification.matchedKeywords.length > 0
                      ? selectedClassification.matchedKeywords.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Sender signals:</span>{" "}
                    {selectedClassification.matchedSenders.length > 0
                      ? selectedClassification.matchedSenders.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">
                      Negative signals:
                    </span>{" "}
                    {selectedClassification.negativeSignals.length > 0
                      ? selectedClassification.negativeSignals.join(", ")
                      : "—"}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <h2 className="text-lg font-semibold text-slate-200">
                  Select a message to inspect the agent
                </h2>
                <p className="text-sm text-slate-400">
                  You'll see the exact heuristics and confidence metrics the agent
                  used to decide where this message should go.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section
        className={clsx(
          "transition-opacity duration-200",
          activeTab === "composer" ? "opacity-100" : "pointer-events-none hidden"
        )}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
            <header className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-50">
                Compose new scenario
              </h2>
              <p className="text-sm text-slate-400">
                Inject a message into the inbox and let the agent classify it in
                real-time. Useful for testing triggers, keywords and sender rules.
              </p>
            </header>

            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Sender
                </span>
                <input
                  value={composer.sender}
                  onChange={handleComposerChange("sender")}
                  placeholder="alex@company.com"
                  className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Subject
                </span>
                <input
                  value={composer.subject}
                  onChange={handleComposerChange("subject")}
                  placeholder="New feature launch retro"
                  className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Body
                </span>
                <textarea
                  value={composer.body}
                  onChange={handleComposerChange("body")}
                  rows={8}
                  placeholder="Provide context so the agent can infer the correct category."
                  className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Tags (comma separated)
                </span>
                <input
                  defaultValue=""
                  value={composer.tags?.join(", ") ?? ""}
                  onChange={(event) => handleTagInput(event.target.value)}
                  placeholder="invoice, follow-up"
                  className="rounded-lg border border-slate-700/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
              </label>

              <fieldset className="flex flex-wrap gap-3">
                <legend className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Importance
                </legend>
                {(["low", "normal", "high"] as Email["importance"][]).map(
                  (level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleImportanceToggle(level)}
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs capitalize transition",
                        composer.importance === level
                          ? "bg-sky-500/20 text-sky-100"
                          : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                      )}
                    >
                      {level}
                    </button>
                  )
                )}
              </fieldset>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreateEmail}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                  disabled={
                    !composer.sender || !composer.subject || !composer.body
                  }
                >
                  Inject email
                </button>
                <button
                  type="button"
                  onClick={resetComposer}
                  className="rounded-lg border border-slate-700/70 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6">
            <header className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-50">Live preview</h2>
              <p className="text-sm text-slate-400">
                Instant evaluation of the draft email using the same heuristics as
                the inbox agent.
              </p>
            </header>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/60 p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">
                  {composer.subject || "Draft subject"}
                </h3>
                <p className="text-xs text-slate-400">{composer.sender || "sender@domain.com"}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {composer.body || "Explain the scenario you want the agent to classify."}
              </p>
              <ComposerPreview composer={composer} categories={categories} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const ComposerPreview = ({
  composer,
  categories
}: {
  composer: Omit<Email, "id">;
  categories: Category[];
}) => {
  const previewEmail: Email = {
    ...composer,
    id: "preview",
    receivedAt: composer.receivedAt || new Date().toISOString()
  };

  const classification = classifyEmail(previewEmail, categories);
  const category =
    categories.find((cat) => cat.id === classification.categoryId) ?? categories[0];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-800/70 bg-slate-900/80 p-4 text-sm">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest",
            category.color
          )}
        >
          {category.name}
        </span>
        <span className="rounded-full bg-slate-800/70 px-2 py-1 text-xs text-slate-200">
          {(classification.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        <div>
          <span className="font-semibold text-slate-200">Reasoning:</span>
          <ul className="mt-2 space-y-1">
            {classification.reasoning.map((item) => (
              <li key={item} className="rounded-md bg-slate-800/60 px-3 py-1">
                {item}
              </li>
            ))}
            {classification.reasoning.length === 0 && (
              <li className="rounded-md bg-slate-800/60 px-3 py-1 text-slate-400">
                Add more context so the agent can articulate a rationale.
              </li>
            )}
          </ul>
        </div>
        <div>
          <span className="font-semibold text-slate-200">Triggers:</span>{" "}
          {classification.matchedKeywords.length > 0
            ? classification.matchedKeywords.join(", ")
            : "—"}
        </div>
        <div>
          <span className="font-semibold text-slate-200">Suggested actions:</span>{" "}
          {classification.suggestedActions.length > 0
            ? classification.suggestedActions.join(", ")
            : "No automation mapped."}
        </div>
      </div>
    </div>
  );
};
