"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { Plus, UserPlus, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Trash2, Loader2 } from "lucide-react";

const RELATIONSHIPS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
];

export default function FamilySetupPage() {
  const router = useRouter();
  const { family, members, registerFamily, registerMember, resetSession, error } = useFamily();

  const [familyName, setFamilyName] = useState(family?.name || "");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("self");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function onCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    setBusy(true);
    setLocalError(null);
    try {
      await registerFamily(familyName.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not create family");
    } finally {
      setBusy(false);
    }
  }

  async function onAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setLocalError(null);
    try {
      await registerMember({
        name: name.trim(),
        relationship,
        age: age ? Number(age) : null,
        city: city.trim() || null,
      });
      setName("");
      setAge("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  }

  // Pre-loader shortcut for instant 1-click Sharma Family demo setup
  async function loadDemoData() {
    setBusy(true);
    setLocalError(null);
    try {
      let currentFamily = family;
      if (!currentFamily) {
        currentFamily = await registerFamily("Sharma Family");
      }
      if (members.length === 0) {
        await registerMember({ name: "Rajesh Sharma", relationship: "self", age: 42, city: "Mumbai" });
        await registerMember({ name: "Priya Sharma", relationship: "spouse", age: 38, city: "Mumbai" });
        await registerMember({ name: "Aarav Sharma", relationship: "child", age: 8, city: "Mumbai" });
        await registerMember({ name: "Ramesh Sharma", relationship: "parent", age: 65, city: "Mumbai" });
      }
      router.push("/upload");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not load demo data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 border-b border-stone-300/80 dark:border-zinc-700 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1a6b5a] bg-emerald-100/80 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            Step 1 of 3
          </span>
          <span className="text-xs text-stone-500 dark:text-zinc-400">• Setup Household Profile</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          Set up your family
        </h1>
        <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
          We&apos;ll analyze coverage for everyone. Add all family members covered under your insurance policies.
        </p>
      </div>

      {/* Step 1: Family Name Form */}
      {!family ? (
        <div className="rounded-2xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#1a6b5a]" />
            1. Name Your Family Profile
          </h2>
          <form onSubmit={onCreateFamily} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 mb-1">
                FAMILY NAME
              </label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Sharma Family"
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-600 px-4 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-stone-50/50 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy || !familyName.trim()}
                className="w-full sm:w-auto rounded-xl bg-[#1a6b5a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#145447] disabled:opacity-50 transition-colors"
              >
                Save Family
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#1a6b5a]" />
            <span className="text-sm text-stone-700 dark:text-zinc-300">
              Family Profile: <strong className="font-semibold text-stone-900 dark:text-zinc-100">{family.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#1a6b5a] bg-emerald-100 px-2 py-1 rounded-md font-medium">
              Active
            </span>
            <button
              type="button"
              disabled={resetting}
              onClick={async () => {
                setResetting(true);
                await resetSession();
                setResetting(false);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-2 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Family Member Form */}
      {family && (
        <div className="rounded-2xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
            <UserPlus size={18} className="text-[#1a6b5a]" />
            Add Family Member Form
          </h2>

          <form onSubmit={onAddMember} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 mb-1">
                NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Sharma"
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 mb-1">
                RELATIONSHIP
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-white dark:bg-zinc-700 dark:text-zinc-200"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 mb-1">
                AGE
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="42"
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-stone-600 dark:text-zinc-400 mb-1">
                CITY
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-600 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 pt-2">
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a6b5a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#145447] disabled:opacity-50 transition-all"
              >
                <Plus size={18} />
                + Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Members List */}
      {members.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">
              Family Members ({members.length})
            </h2>
            <span className="text-xs text-stone-500 dark:text-zinc-400">Ready for policy assignment</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const initials = m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-2xs hover:border-stone-300 dark:hover:border-zinc-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2922] font-mono font-bold text-emerald-300 text-sm border border-emerald-900">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">{m.name}</h3>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 capitalize">
                        {m.relationship} {m.age != null ? `· ${m.age}` : ""} {m.city ? `· ${m.city}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {(localError || error) && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-400">
          {localError || error}
        </div>
      )}

      {/* Demo Pre-loader Shortcut + Primary CTA Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-300/80 dark:border-zinc-700">
        <button
          type="button"
          onClick={loadDemoData}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/30 px-4 py-2.5 text-xs font-semibold text-[#1a6b5a] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <Sparkles size={16} className="text-[#1a6b5a]" />
          Quick Demo: Load Sharma Family (4 members)
        </button>

        <Link
          href="/upload"
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] dark:bg-zinc-100 px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 shadow-md hover:bg-black dark:hover:bg-zinc-200 transition-all ${
            members.length === 0 ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span>Continue to Upload</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
