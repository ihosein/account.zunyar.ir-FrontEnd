"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderOpen,
  ListPlus,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import {
  buildManualListFromRecipients,
  buildRecipientTemplate,
  deleteParamTemplate,
  downloadParamExcel,
  EMPTY_PARAM_TABLE,
  findDuplicateColumns,
  isPresetParamColumn,
  loadParamTemplates,
  normalizeDraftTable,
  parseParamFile,
  PRESET_PARAMS,
  saveParamTemplate,
  type ParamRecipient,
  type ParamTable,
  type SavedParamTemplate,
} from "@/lib/excel-params";
import { faNum, t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { dialogPrimaryBtnClass, inputClass } from "@/lib/ui";

type Props = {
  value: ParamTable;
  onChange: (next: ParamTable) => void;
  onInsertParam?: (paramName: string) => void;
  /** کاربران انتخاب‌شده برای دانلود قالب اکسل */
  recipients?: ParamRecipient[];
};

type DraftState = {
  columns: string[];
  cells: string[][];
};

function tableToDraft(table: ParamTable): DraftState {
  return {
    columns: [...table.columns],
    cells: table.rows.map((r) => table.columns.map((c) => r[c] ?? "")),
  };
}

export function ParamDataEditor({ value, onChange, onInsertParam, recipients = [] }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [draft, setDraft] = useState<DraftState>({ columns: [], cells: [] });
  const [templates, setTemplates] = useState<SavedParamTemplate[]>([]);
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => {
    if (!value.columns.length) return null;
    return t("admin.paramSummary", {
      cols: faNum(value.columns.length),
      rows: faNum(value.rows.length),
    });
  }, [value]);

  const customColumns = useMemo(
    () => value.columns.filter((c) => !(PRESET_PARAMS as readonly string[]).includes(c)),
    [value.columns],
  );

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const table = await parseParamFile(file);
      if (!table.columns.length) {
        toast.error(t("admin.paramFileEmpty"));
        return;
      }
      onChange(table);
      setPreviewOpen(true);
      toast.success(t("admin.paramFileLoaded"));
    } catch (err) {
      toast.error(
        err instanceof Error && err.message === "UNSUPPORTED_FILE"
          ? t("admin.paramFileUnsupported")
          : t("admin.paramFileFailed"),
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadTemplate() {
    if (!recipients.length) {
      toast.error(t("admin.paramNeedRecipients"));
      return;
    }
    setBusy(true);
    try {
      const table = buildRecipientTemplate(recipients, customColumns);
      await downloadParamExcel(table, "param-users.xlsx");
      toast.success(t("admin.paramTemplateDownloaded"));
    } catch {
      toast.error(t("admin.paramFileFailed"));
    } finally {
      setBusy(false);
    }
  }

  function openManual() {
    if (!recipients.length) {
      toast.error(t("admin.paramNeedRecipients"));
      return;
    }
    setDraft(tableToDraft(buildManualListFromRecipients(recipients, value)));
    setManualOpen(true);
  }

  function addColumn() {
    setDraft((d) => {
      let name = t("admin.paramNewColumn");
      let i = 1;
      while (d.columns.includes(name)) {
        i += 1;
        name = `${t("admin.paramNewColumn")} ${faNum(i)}`;
      }
      return {
        columns: [...d.columns, name],
        cells: d.cells.map((row) => [...row, ""]),
      };
    });
  }

  function setColumnName(index: number, nextName: string) {
    const current = draft.columns[index];
    if (current && isPresetParamColumn(current)) return;
    setDraft((d) => ({
      ...d,
      columns: d.columns.map((c, i) => (i === index ? nextName : c)),
    }));
  }

  function removeColumn(index: number) {
    const col = draft.columns[index];
    if (col && isPresetParamColumn(col)) {
      toast.error(t("admin.paramPresetColumnLocked"));
      return;
    }
    setDraft((d) => ({
      columns: d.columns.filter((_, i) => i !== index),
      cells: d.cells.map((row) => row.filter((_, i) => i !== index)),
    }));
  }

  function setCell(rowIndex: number, colIndex: number, cell: string) {
    const col = draft.columns[colIndex];
    if (col && isPresetParamColumn(col)) return;
    setDraft((d) => ({
      ...d,
      cells: d.cells.map((row, i) =>
        i === rowIndex ? row.map((c, j) => (j === colIndex ? cell : c)) : row,
      ),
    }));
  }

  function saveManual() {
    if (!draft.columns.length) {
      toast.error(t("admin.paramNeedColumns"));
      return;
    }
    const empty = draft.columns.some((c) => !c.trim());
    if (empty) {
      toast.error(t("admin.paramEmptyColumn"));
      return;
    }
    const dupes = findDuplicateColumns(draft.columns);
    if (dupes.length) {
      toast.error(t("admin.paramColumnDuplicate"));
      return;
    }
    try {
      onChange(normalizeDraftTable(draft.columns, draft.cells));
      setManualOpen(false);
      toast.success(t("admin.paramListSaved"));
    } catch {
      toast.error(t("admin.paramColumnDuplicate"));
    }
  }

  function openTemplates() {
    setTemplates(loadParamTemplates());
    setTemplatesOpen(true);
  }

  function confirmSaveTemplate() {
    if (!value.columns.length) {
      toast.error(t("admin.paramNeedColumns"));
      return;
    }
    const name = saveName.trim();
    if (!name) {
      toast.error(t("admin.paramTemplateNameRequired"));
      return;
    }
    saveParamTemplate(name, value);
    setSaveOpen(false);
    setSaveName("");
    toast.success(t("admin.paramTemplateSaved"));
  }

  function applyTemplate(tpl: SavedParamTemplate) {
    onChange({
      columns: [...tpl.columns],
      rows: tpl.rows.map((r) => ({ ...r })),
    });
    setTemplatesOpen(false);
    toast.success(t("admin.paramTemplateLoaded"));
  }

  function removeTemplate(id: string) {
    deleteParamTemplate(id);
    setTemplates(loadParamTemplates());
    toast.success(t("admin.paramTemplateDeleted"));
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--zy-ink)]">{t("admin.paramTitle")}</p>
          <p className="mt-0.5 text-[11px] text-[var(--zy-muted)]">{t("admin.paramHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadTemplate()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
          >
            <Download size={14} />
            {t("admin.paramDownloadExcel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
          >
            <Upload size={14} />
            {busy ? t("common.loading") : t("admin.paramUploadExcel")}
          </button>
          <button
            type="button"
            onClick={openManual}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10"
          >
            <ListPlus size={14} />
            {t("admin.paramManualList")}
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveName("");
              setSaveOpen(true);
            }}
            disabled={!value.columns.length}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
          >
            <Save size={14} />
            {t("admin.paramSaveTemplate")}
          </button>
          <button
            type="button"
            onClick={openTemplates}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10"
          >
            <FolderOpen size={14} />
            {t("admin.paramLoadTemplate")}
          </button>
          {value.columns.length > 0 ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent-500/30 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-500/10 dark:text-accent-300"
            >
              <FileSpreadsheet size={14} />
              {t("admin.paramViewData")}
            </button>
          ) : null}
        </div>
      </div>

      {summary ? (
        <p className="text-xs font-medium text-[var(--zy-ink)]">{summary}</p>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[11px] text-[var(--zy-muted)]">{t("admin.paramPresetHint")}</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PARAMS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onInsertParam?.(col)}
              className="zy-chip cursor-pointer !border-accent-500/30 !bg-accent-500/10 !text-xs hover:bg-accent-500/20"
              title={t("admin.paramInsertHint")}
            >
              {`{${col}}`}
            </button>
          ))}
          {customColumns.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onInsertParam?.(col)}
              className="zy-chip cursor-pointer !text-xs hover:bg-accent-500/15"
              title={t("admin.paramInsertHint")}
            >
              {`{${col}}`}
            </button>
          ))}
        </div>
      </div>

      <GlassDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t("admin.paramPreviewTitle")}
        wide
      >
        <ParamTableView table={value} />
      </GlassDialog>

      <GlassDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={t("admin.paramSaveTemplate")}
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.paramTemplateName")}</span>
            <input
              className={inputClass}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t("admin.paramTemplateNamePlaceholder")}
              autoFocus
            />
          </label>
          <div className="flex justify-end">
            <button type="button" onClick={confirmSaveTemplate} className={dialogPrimaryBtnClass}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </GlassDialog>

      <GlassDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title={t("admin.paramLoadTemplate")}
      >
        {templates.length === 0 ? (
          <p className="text-sm text-[var(--zy-muted)]">{t("admin.paramTemplatesEmpty")}</p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-auto">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 cursor-pointer text-start"
                  onClick={() => applyTemplate(tpl)}
                >
                  <p className="truncate text-sm font-semibold text-[var(--zy-ink)]">{tpl.name}</p>
                  <p className="text-[11px] text-[var(--zy-muted)]">
                    {t("admin.paramSummary", {
                      cols: faNum(tpl.columns.length),
                      rows: faNum(tpl.rows.length),
                    })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => removeTemplate(tpl.id)}
                  className="shrink-0 text-red-500"
                  title={t("common.delete")}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassDialog>

      <GlassDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title={t("admin.paramManualTitle")}
        wide
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--zy-muted)]">{t("admin.paramManualHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold"
            >
              <Plus size={12} />
              {t("admin.paramAddColumn")}
            </button>
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-xl border border-[var(--zy-border)]">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-[var(--zy-surface)]">
                <tr>
                  {draft.columns.map((col, ci) => {
                    const locked = isPresetParamColumn(col);
                    return (
                      <th key={`h-${ci}`} className="border-b border-[var(--zy-border)] p-2 text-start">
                        <div className="flex items-center gap-1">
                          {locked ? (
                            <span className="px-1 text-xs font-semibold text-[var(--zy-ink)]">
                              {col}
                            </span>
                          ) : (
                            <input
                              className={clsx(inputClass, "!min-h-0 !px-2 !py-1 !text-xs")}
                              value={col}
                              onChange={(e) => setColumnName(ci, e.target.value)}
                            />
                          )}
                          {!locked ? (
                            <button
                              type="button"
                              onClick={() => removeColumn(ci)}
                              className="shrink-0 text-red-500"
                              title={t("common.delete")}
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {draft.cells.map((row, ri) => (
                  <tr key={`r-${ri}`}>
                    {draft.columns.map((col, ci) => {
                      const locked = isPresetParamColumn(col);
                      return (
                        <td key={`${ri}-${ci}`} className="border-b border-[var(--zy-border)] p-1.5">
                          {locked ? (
                            <span
                              className="block truncate px-1 py-1 text-[var(--zy-ink)]"
                              dir="auto"
                            >
                              {row[ci] || "—"}
                            </span>
                          ) : (
                            <input
                              className={clsx(inputClass, "!min-h-0 !px-2 !py-1 !text-xs")}
                              value={row[ci] ?? ""}
                              onChange={(e) => setCell(ri, ci, e.target.value)}
                              dir="auto"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={saveManual} className={dialogPrimaryBtnClass}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </GlassDialog>
    </div>
  );
}

function ParamTableView({ table }: { table: ParamTable }) {
  if (!table.columns.length) {
    return <p className="text-sm text-[var(--zy-muted)]">{t("admin.paramEmpty")}</p>;
  }
  return (
    <div className="max-h-[60vh] overflow-auto rounded-xl border border-[var(--zy-border)]">
      <table className="min-w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-[var(--zy-surface)]">
          <tr>
            {table.columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap border-b border-[var(--zy-border)] px-3 py-2 text-start font-semibold text-[var(--zy-ink)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="odd:bg-[var(--zy-surface)]/40">
              {table.columns.map((col) => (
                <td
                  key={`${i}-${col}`}
                  className="whitespace-nowrap border-b border-[var(--zy-border)] px-3 py-1.5 text-[var(--zy-ink)]"
                  dir="auto"
                >
                  {row[col] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-[var(--zy-muted)]">
        {t("admin.paramSummary", {
          cols: faNum(table.columns.length),
          rows: faNum(table.rows.length),
        })}
      </p>
    </div>
  );
}
