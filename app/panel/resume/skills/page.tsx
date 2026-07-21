"use client";

import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { CertificateUpload } from "@/components/ui/CertificateUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import { t, faNum } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { Skill } from "@/types/account";

const PROF = [
  { value: "BEGINNER", labelKey: "panel.profBeginner" },
  { value: "INTERMEDIATE", labelKey: "panel.profIntermediate" },
  { value: "ADVANCED", labelKey: "panel.profAdvanced" },
  { value: "EXPERT", labelKey: "panel.profExpert" },
] as const;

type Form = { name: string; proficiency: string; yearLearned: string; certificateUrl?: string };
const EMPTY: Form = {
  name: "",
  proficiency: "INTERMEDIATE",
  yearLearned: "",
  certificateUrl: undefined,
};

function profLabel(code: string) {
  return t(PROF.find((p) => p.value === code)?.labelKey ?? "panel.profIntermediate");
}

function yearsSince(yearLearned?: number | null): number | null {
  if (!yearLearned) return null;
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - yearLearned);
}

export default function ResumeSkillsPage() {
  const [rows, setRows] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    try {
      setRows(await api<Skill[]>("/resume/skills"));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: Skill) {
    setEditing(row);
    setForm({
      name: row.name,
      proficiency: row.proficiency,
      yearLearned: row.yearLearned != null ? String(row.yearLearned) : "",
      certificateUrl: row.certificateUrl || undefined,
    });
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        proficiency: form.proficiency,
        yearLearned: form.yearLearned ? Number(form.yearLearned) : null,
        certificateUrl: form.certificateUrl || undefined,
      };
      if (editing) {
        await api(`/resume/skills/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/resume/skills", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      await load();
      toast.success(t("panel.settingsSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (deleteId == null) return;
    setBusy(true);
    try {
      await api(`/resume/skills/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      await load();
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.resumeSkills")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.resumeSkillsHint")}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} />
          {t("panel.addSkill")}
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Sparkles size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.resumeEmpty")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const years = yearsSince(row.yearLearned);
          return (
            <div key={row.id} className="glass-card-static p-1">
              <div className="glass-inner !m-2 flex items-start justify-between gap-3 !p-5">
                <div>
                  <p className="font-bold text-[var(--zy-ink)]">{row.name}</p>
                  <p className="mt-1 text-sm text-accent-700 dark:text-accent-300">
                    {profLabel(row.proficiency)}
                  </p>
                  {years != null && (
                    <p className="mt-1 text-xs text-[var(--zy-muted)]">
                      {faNum(years)} {t("panel.yearsExpLabel")}
                    </p>
                  )}
                  {row.certificateUrl && (
                    <a
                      href={row.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
                    >
                      <ExternalLink size={12} />
                      {t("panel.viewFile")}
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-2 text-accent-600 hover:bg-accent-500/10">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => setDeleteId(row.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GlassDialog open={open} onClose={() => setOpen(false)} title={editing ? t("panel.editSkill") : t("panel.addSkill")}>
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.name))}>{t("panel.skillName")}</span>
            <input
              className={fieldInputClass(isBlank(form.name))}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.proficiency))}>{t("panel.proficiency")}</span>
            <GlassSelect
              value={form.proficiency}
              onChange={(v) => setForm((f) => ({ ...f, proficiency: v }))}
              options={PROF.map((p) => ({ value: p.value, label: t(p.labelKey) }))}
              invalid={isBlank(form.proficiency)}
            />
          </label>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.yearLearned))}>{t("panel.yearLearned")}</span>
            <input
              className={fieldInputClass(isBlank(form.yearLearned))}
              value={form.yearLearned}
              onChange={(e) => setForm((f) => ({ ...f, yearLearned: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
            />
          </label>
          <CertificateUpload
            value={form.certificateUrl}
            onChange={(url) => setForm((f) => ({ ...f, certificateUrl: url }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-xl px-4 py-2 text-sm">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={busy} className={dialogPrimaryBtnClass}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        title={t("panel.deleteConfirm")}
        message={t("panel.deleteConfirm")}
        danger
        busy={busy}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
