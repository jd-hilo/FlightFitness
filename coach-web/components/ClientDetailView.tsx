"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { emptyWeekPlan } from "@/lib/emptyWeekPlan";
import type { Exercise, Meal, WeekPlan, WorkoutDay } from "@/lib/flight/plan";
import { viewWeekStartYmdLocal } from "@/lib/flight/weekUtils";

type Tab = "overview" | "meals" | "workouts" | "messages";

type Msg = {
  id: string;
  sender: "user" | "coach";
  body: string;
  created_at: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ClientDetailView({
  clientId,
  initialTab = "overview",
}: {
  clientId: string;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [weekStart, setWeekStart] = useState(() => viewWeekStartYmdLocal());
  const [profile, setProfile] = useState<{
    id: string;
    subscription_tier: string;
    display_name: string | null;
    email: string | null;
    onboarding_json: unknown;
  } | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [composer, setComposer] = useState("");

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clients/${clientId}?weekStart=${encodeURIComponent(weekStart)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as {
        profile?: typeof profile;
        plan?: WeekPlan | null;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        setProfile(null);
        setPlan(null);
        return;
      }
      setProfile(json.profile ?? null);
      setPlan(json.plan ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId, weekStart]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/messages`, { credentials: "include" });
      const json = (await res.json()) as { messages?: Msg[]; error?: string };
      if (res.ok) setMessages(json.messages ?? []);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  useEffect(() => {
    if (tab !== "messages") return;
    void loadMessages();
    const id = setInterval(() => void loadMessages(), 4000);
    return () => clearInterval(id);
  }, [tab, loadMessages]);

  useEffect(() => {
    if (tab !== "messages") return;
    void fetch(`/api/clients/${clientId}/coach-read`, { method: "POST", credentials: "include" });
  }, [tab, clientId]);

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    setSaveOk(false);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/plan`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage() {
    const body = composer.trim();
    if (!body) return;
    const res = await fetch(`/api/clients/${clientId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setComposer("");
      void loadMessages();
    }
  }

  function updateMeal(dayIndex: number, mealId: string, patch: Partial<Meal>) {
    setPlan((p) => {
      if (!p) return p;
      const mealsByDay = p.mealsByDay.map((day, i) => {
        if (i !== dayIndex) return day;
        return day.map((m) => (m.id === mealId ? { ...m, ...patch } : m));
      });
      return { ...p, mealsByDay };
    });
  }

  function updateWorkout(dayIndex: number, w: WorkoutDay | null) {
    setPlan((p) => {
      if (!p) return p;
      const workoutsByDay = p.workoutsByDay.map((x, i) => (i === dayIndex ? w : x));
      return { ...p, workoutsByDay };
    });
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<Exercise>) {
    setPlan((p) => {
      if (!p) return p;
      const workoutsByDay = p.workoutsByDay.map((w, i) => {
        if (i !== dayIndex || !w) return w;
        const exercises = w.exercises.map((ex, j) => (j === exIndex ? { ...ex, ...patch } : ex));
        return { ...w, exercises };
      });
      return { ...p, workoutsByDay };
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "meals", label: "Meals" },
    { id: "workouts", label: "Workouts" },
    { id: "messages", label: "Messages" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-amber-400">
          ← Clients
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-white">
          {profile?.display_name || profile?.email || clientId.slice(0, 8)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              tab === t.id ? "bg-zinc-800 text-amber-300" : "text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-400">
          Week start (Mon){" "}
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="ml-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-zinc-100 font-mono text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadClient()}
          className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-200"
        >
          Load week
        </button>
        {(tab === "meals" || tab === "workouts") && (
          <>
            {!plan ? (
              <button
                type="button"
                onClick={() => setPlan(emptyWeekPlan(weekStart))}
                className="text-sm px-3 py-1.5 rounded-md bg-amber-600/20 text-amber-300 border border-amber-500/40"
              >
                Create blank plan for this week
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void savePlan()}
                className="text-sm px-4 py-1.5 rounded-md bg-amber-500 text-black font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : saveOk ? "Saved" : "Save plan"}
              </button>
            )}
          </>
        )}
      </div>

      {error ? <p className="text-red-400 text-sm">{error}</p> : null}
      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : !profile ? (
        <p className="text-zinc-500">Client not found.</p>
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/40">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Account</h3>
                  <p className="text-zinc-200">Tier: {profile.subscription_tier}</p>
                  <p className="text-zinc-400 font-mono text-xs mt-1 break-all">{profile.id}</p>
                  {profile.email ? <p className="text-zinc-300 mt-2">{profile.email}</p> : null}
                </div>
                <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/40">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Plan status</h3>
                  <p className="text-zinc-300">{plan ? "Plan loaded for selected week." : "No plan row for this week yet."}</p>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/40">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Onboarding (JSON)</h3>
                <pre className="text-xs text-zinc-400 overflow-auto max-h-80 whitespace-pre-wrap">
                  {JSON.stringify(profile.onboarding_json, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {tab === "meals" && (
            <div className="space-y-6">
              {!plan ? (
                <p className="text-zinc-500 text-sm">No plan for this week. Create a blank plan or pick another week.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <label className="text-zinc-400">
                      Calories
                      <input
                        type="number"
                        className="block w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                        value={plan.macroTargets.calories}
                        onChange={(e) =>
                          setPlan({
                            ...plan,
                            macroTargets: {
                              ...plan.macroTargets,
                              calories: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </label>
                    <label className="text-zinc-400">
                      Protein g
                      <input
                        type="number"
                        className="block w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={plan.macroTargets.proteinG}
                        onChange={(e) =>
                          setPlan({
                            ...plan,
                            macroTargets: {
                              ...plan.macroTargets,
                              proteinG: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </label>
                    <label className="text-zinc-400">
                      Carbs g
                      <input
                        type="number"
                        className="block w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={plan.macroTargets.carbsG}
                        onChange={(e) =>
                          setPlan({
                            ...plan,
                            macroTargets: {
                              ...plan.macroTargets,
                              carbsG: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </label>
                    <label className="text-zinc-400">
                      Fat g
                      <input
                        type="number"
                        className="block w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                        value={plan.macroTargets.fatG}
                        onChange={(e) =>
                          setPlan({
                            ...plan,
                            macroTargets: {
                              ...plan.macroTargets,
                              fatG: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  {plan.mealsByDay.map((meals, dayIndex) => (
                    <div key={dayIndex} className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/30">
                      <h4 className="text-amber-400 font-semibold mb-3">{DAYS[dayIndex]}</h4>
                      <div className="space-y-3">
                        {meals.map((meal) => (
                          <div key={meal.id} className="border border-zinc-800 rounded-md p-3 space-y-2">
                            <input
                              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-medium"
                              value={meal.name}
                              onChange={(e) => updateMeal(dayIndex, meal.id, { name: e.target.value })}
                            />
                            <textarea
                              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs min-h-[60px]"
                              value={meal.description}
                              onChange={(e) => updateMeal(dayIndex, meal.id, { description: e.target.value })}
                            />
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="text-zinc-500">P</span>
                              <input
                                type="number"
                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1"
                                value={meal.macros.proteinG}
                                onChange={(e) =>
                                  updateMeal(dayIndex, meal.id, {
                                    macros: {
                                      ...meal.macros,
                                      proteinG: Number(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                              <span className="text-zinc-500">C</span>
                              <input
                                type="number"
                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1"
                                value={meal.macros.carbsG}
                                onChange={(e) =>
                                  updateMeal(dayIndex, meal.id, {
                                    macros: {
                                      ...meal.macros,
                                      carbsG: Number(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                              <span className="text-zinc-500">F</span>
                              <input
                                type="number"
                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1"
                                value={meal.macros.fatG}
                                onChange={(e) =>
                                  updateMeal(dayIndex, meal.id, {
                                    macros: {
                                      ...meal.macros,
                                      fatG: Number(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                              <span className="text-zinc-500">kcal</span>
                              <input
                                type="number"
                                className="w-20 bg-zinc-950 border border-zinc-700 rounded px-1"
                                value={meal.macros.kcal}
                                onChange={(e) =>
                                  updateMeal(dayIndex, meal.id, {
                                    macros: {
                                      ...meal.macros,
                                      kcal: Number(e.target.value) || 0,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "workouts" && (
            <div className="space-y-6">
              {!plan ? (
                <p className="text-zinc-500 text-sm">No plan for this week.</p>
              ) : (
                plan.workoutsByDay.map((w, dayIndex) => (
                  <div key={dayIndex} className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-amber-400 font-semibold">{DAYS[dayIndex]}</h4>
                      <div className="flex gap-2">
                        {w ? (
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300"
                            onClick={() => updateWorkout(dayIndex, null)}
                          >
                            Rest day
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50"
                            onClick={() =>
                              updateWorkout(dayIndex, {
                                dayIndex,
                                title: "Training",
                                exercises: [
                                  {
                                    id: `ex-${dayIndex}-0`,
                                    name: "Exercise",
                                    sets: 3,
                                    reps: "10",
                                    restSec: 60,
                                  },
                                ],
                              })
                            }
                          >
                            Add workout
                          </button>
                        )}
                      </div>
                    </div>
                    {!w ? (
                      <p className="text-zinc-500 text-sm">Rest</p>
                    ) : (
                      <div className="space-y-3">
                        <input
                          className="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-medium"
                          value={w.title}
                          onChange={(e) => updateWorkout(dayIndex, { ...w, title: e.target.value })}
                        />
                        {w.exercises.map((ex, exIndex) => (
                          <div key={ex.id} className="border border-zinc-800 rounded-md p-3 grid sm:grid-cols-2 gap-2 text-sm">
                            <input
                              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 sm:col-span-2"
                              value={ex.name}
                              onChange={(e) => updateExercise(dayIndex, exIndex, { name: e.target.value })}
                            />
                            <label className="text-zinc-400 text-xs">
                              Sets
                              <input
                                type="number"
                                className="block w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1"
                                value={ex.sets}
                                onChange={(e) =>
                                  updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) || 0 })
                                }
                              />
                            </label>
                            <label className="text-zinc-400 text-xs">
                              Reps
                              <input
                                className="block w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1"
                                value={ex.reps}
                                onChange={(e) => updateExercise(dayIndex, exIndex, { reps: e.target.value })}
                              />
                            </label>
                            <label className="text-zinc-400 text-xs">
                              Rest sec
                              <input
                                type="number"
                                className="block w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1"
                                value={ex.restSec}
                                onChange={(e) =>
                                  updateExercise(dayIndex, exIndex, { restSec: Number(e.target.value) || 0 })
                                }
                              />
                            </label>
                            <label className="text-zinc-400 text-xs sm:col-span-2">
                              Notes
                              <input
                                className="block w-full mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1"
                                value={ex.notes ?? ""}
                                onChange={(e) => updateExercise(dayIndex, exIndex, { notes: e.target.value })}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "messages" && (
            <div className="flex flex-col h-[min(70vh,640px)] border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        m.sender === "coach"
                          ? "ml-auto bg-amber-900/40 text-amber-50 border border-amber-800/40"
                          : "mr-auto bg-zinc-800 text-zinc-100 border border-zinc-700"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
                        {m.sender} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-zinc-800 p-3 flex gap-2">
                <textarea
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm min-h-[44px] resize-none"
                  placeholder="Write to your client…"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  className="self-end px-4 py-2 rounded-md bg-amber-500 text-black font-semibold text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
