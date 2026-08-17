"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { Plus, UserPlus, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Trash2, Loader2, Users, Shield, HeartPulse } from "lucide-react";

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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold tracking-wide">
              <ShieldCheck size={12} />
              Step 1 of 3
            </span>
            <span className="text-xs text-emerald-200/80">Setup Household Profile</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Set up your family
          </h1>
          <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed max-w-lg">
            We&apos;ll analyze coverage for everyone. Add all family members covered under your insurance policies.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/70">
              <HeartPulse size={14} />
              <span>Health Insurance</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/70">
              <Shield size={14} />
              <span>Life Insurance</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-200/70">
              <Users size={14} />
              <span>Full Family Coverage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Family Name */}
      {!family ? (
        <div className="card-elevated p-6">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <ShieldCheck size={16} className="text-[#1a6b5a]" />
            </div>
            Name Your Family Profile
          </h2>
          <form onSubmit={onCreateFamily} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">
                Family Name
              </label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Sharma Family"
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 px-4 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-stone-50/50 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy || !familyName.trim()}
                className="w-full sm:w-auto rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 hover:shadow-lg hover:shadow-emerald-900/25 disabled:opacity-50 transition-all"
              >
                Save Family
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 size={18} className="text-[#1a6b5a]" />
            </div>
            <span className="text-sm text-stone-700 dark:text-zinc-300">
              Family Profile: <strong className="font-semibold text-stone-900 dark:text-zinc-100">{family.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg">
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
              className="inline-flex items-center gap-1 rounded-lg border border-red-200/60 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 px-2 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
            >
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Member Form */}
      {family && (
        <div className="card-elevated p-6 space-y-5">
          <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <UserPlus size={16} className="text-[#1a6b5a]" />
            </div>
            Add Family Members
          </h2>

          <form onSubmit={onAddMember} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Sharma"
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-stone-50/30 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-white dark:bg-zinc-800 dark:text-zinc-200"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="42"
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-stone-50/30 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 px-3.5 py-2.5 text-sm focus:border-[#1a6b5a] focus:outline-none focus:ring-2 focus:ring-[#1a6b5a]/20 bg-stone-50/30 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 pt-1">
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 hover:shadow-lg disabled:opacity-50 transition-all"
              >
                <Plus size={16} />
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Members Grid */}
      {members.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">
              Family Members ({members.length})
            </h2>
            <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-500">Ready for policy assignment</span>
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
                  className="card-elevated flex items-center justify-between p-4 hover:scale-[1.01] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-hero font-mono font-bold text-emerald-300 text-sm shadow-sm">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900 dark:text-zinc-100 text-sm">{m.name}</h3>
                      <p className="text-xs text-stone-400 dark:text-zinc-500 capitalize">
                        {m.relationship} {m.age != null ? `· ${m.age}y` : ""} {m.city ? `· ${m.city}` : ""}
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
        <div className="rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {localError || error}
        </div>
      )}

      {/* CTA Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-200/60 dark:border-zinc-800">
        <button
          type="button"
          onClick={loadDemoData}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-[#1a6b5a] dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50 transition-all"
        >
          <Sparkles size={14} className="text-[#1a6b5a]" />
          Quick Demo: Load Sharma Family (4 members)
        </button>

        <Link
          href="/upload"
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-zinc-100 px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 shadow-lg shadow-stone-900/20 hover:shadow-xl hover:bg-stone-800 dark:hover:bg-zinc-200 transition-all ${
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
