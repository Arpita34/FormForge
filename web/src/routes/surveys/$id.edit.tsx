import { surveysApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Question } from "@survey-builder/shared";
import type { QuestionType } from "@survey-builder/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

export const Route = createFileRoute("/surveys/$id/edit")({
  component: SurveyBuilderPage,
});

// ── Local draft shape ────────────────────────────────────────────────────────
interface DraftQuestion {
  draftId: string; // temp id for dnd-kit (may not have server id yet)
  id?: string;
  type: QuestionType;
  label: string;
  options: string[];
  required: boolean;
  position: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short Answer",
  multiple_choice: "Multiple Choice",
  rating: "1–5 Rating",
  long_text: "Long Text",
  date: "Date",
};

const TYPE_ICONS: Record<QuestionType, string> = {
  short_text: "✏️",
  multiple_choice: "☑️",
  rating: "⭐",
  long_text: "📝",
  date: "📅",
};

let draftCounter = 0;
function newDraftId() {
  return `draft-${++draftCounter}`;
}

function questionToD(q: Question): DraftQuestion {
  return {
    draftId: q.id,
    id: q.id,
    type: q.type,
    label: q.label,
    options: q.options ?? ["Option 1", "Option 2"],
    required: q.required,
    position: q.position,
  };
}

// ── Main page ────────────────────────────────────────────────────────────────
function SurveyBuilderPage() {
  const { id } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!authLoading && !user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey", id],
    queryFn: () => surveysApi.get(id),
  });

  // ── Draft state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [logoUrl, setLogoUrl] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [saveToast, setSaveToast] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description ?? "");
      setPrimaryColor(survey.primary_color);
      setLogoUrl(survey.logo_url ?? "");
      setQuestions(survey.questions.map(questionToD));
    }
  }, [survey]);

  const saveMutation = useMutation({
    mutationFn: () =>
      surveysApi.update(id, {
        title,
        description: description || undefined,
        primary_color: primaryColor,
        logo_url: logoUrl || undefined,
        questions: questions.map((q, i) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          options: q.type === "multiple_choice" ? q.options : undefined,
          required: q.required,
          position: i,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", id] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setSaveToast("Survey saved ✓");
      setTimeout(() => setSaveToast(""), 3000);
    },
  });

  // ── DnD ─────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((prev) => {
        const oldIdx = prev.findIndex((q) => q.draftId === active.id);
        const newIdx = prev.findIndex((q) => q.draftId === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  // ── Question CRUD ────────────────────────────────────────────────────────
  function addQuestion(type: QuestionType) {
    setQuestions((prev) => [
      ...prev,
      {
        draftId: newDraftId(),
        type,
        label: "",
        options: type === "multiple_choice" ? ["Option 1", "Option 2"] : [],
        required: false,
        position: prev.length,
      },
    ]);
  }

  function updateQuestion(draftId: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.draftId === draftId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(draftId: string) {
    setQuestions((prev) => prev.filter((q) => q.draftId !== draftId));
  }

  const canShare = questions.length > 0;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading builder…</span>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="alert alert-error">Survey not found.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "6rem" }}>
      {/* ── Top bar ── */}
      <div
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          padding: "0.75rem 0",
          position: "sticky",
          top: 60,
          zIndex: 40,
        }}
      >
        <div className="container flex-between gap-3">
          <div className="flex gap-3" style={{ alignItems: "center", minWidth: 0 }}>
            <Link to="/dashboard" className="btn btn-ghost btn-sm">
              ← Dashboard
            </Link>
            <span className="text-secondary" style={{ fontSize: "0.875rem" }}>
              /
            </span>
            <input
              id="survey-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{
                background: "transparent",
                border: "1px solid transparent",
                fontWeight: 600,
                fontSize: "1rem",
                maxWidth: 320,
                padding: "0.25rem 0.5rem",
              }}
              placeholder="Survey title"
              maxLength={200}
            />
          </div>
          <div className="flex gap-2">
            {saveToast && <span className="badge badge-success animate-in">{saveToast}</span>}
            {canShare && survey && (
              <button
                type="button"
                id="copy-share-link"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/s/${survey.public_id}`);
                  setSaveToast("Link copied!");
                  setTimeout(() => setSaveToast(""), 2000);
                }}
              >
                📋 Share
              </button>
            )}
            {!canShare && (
              <span
                className="btn btn-ghost btn-sm"
                title="Add at least one question to share"
                style={{ opacity: 0.4, cursor: "not-allowed" }}
              >
                📋 Share
              </span>
            )}
            <button
              id="save-survey"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim()}
            >
              {saveMutation.isPending ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{" "}
                  Saving…
                </>
              ) : (
                "Save Survey"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        className="container editor-grid"
        style={{
          paddingTop: "2rem",
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* ── Left: Questions ── */}
        <div>
          {/* Description */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="survey-description" className="form-label">
              Description <span className="text-muted">(optional)</span>
            </label>
            <input
              id="survey-description"
              type="text"
              className="form-input"
              placeholder="Brief description for respondents"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3>
              Questions <span className="badge badge-muted">{questions.length}</span>
            </h3>
          </div>

          {/* Question type add buttons */}
          <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {(
              ["short_text", "multiple_choice", "rating", "long_text", "date"] as QuestionType[]
            ).map((type) => (
              <button
                key={type}
                type="button"
                id={`add-question-${type}`}
                className="btn btn-secondary btn-sm"
                onClick={() => addQuestion(type)}
              >
                {TYPE_ICONS[type]} {TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Sortable question list */}
          {questions.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "3rem 2rem",
                border: "2px dashed var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>+</div>
              <p>Add your first question above</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.draftId)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {questions.map((q, index) => (
                    <SortableQuestionCard
                      key={q.draftId}
                      question={q}
                      index={index}
                      onUpdate={(patch) => updateQuestion(q.draftId, patch)}
                      onRemove={() => removeQuestion(q.draftId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* ── Right: Branding panel ── */}
        <div style={{ position: "sticky", top: "120px" }}>
          <BrandingPanel
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            showColorPicker={showColorPicker}
            onColorChange={setPrimaryColor}
            onLogoUrlChange={setLogoUrl}
            onTogglePicker={() => setShowColorPicker((v) => !v)}
            publicId={survey.public_id}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sortable Question Card ────────────────────────────────────────────────────
function SortableQuestionCard({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: DraftQuestion;
  index: number;
  onUpdate: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.draftId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card animate-in">
      {/* Header row */}
      <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
        <div className="flex gap-2" style={{ alignItems: "center" }}>
          {/* Drag handle */}
          <button
            type="button"
            className="drag-handle"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <title>Drag handle</title>
              <path d="M2 4h12v1H2zm0 4h12v1H2zm0 4h12v1H2z" />
            </svg>
          </button>
          <span className="badge badge-muted">
            {TYPE_ICONS[question.type]} {TYPE_LABELS[question.type]}
          </span>
          <span className="text-xs text-muted">Q{index + 1}</span>
        </div>
        <div className="flex gap-2" style={{ alignItems: "center" }}>
          <div className="flex gap-2" style={{ alignItems: "center", cursor: "pointer" }}>
            <span className="text-xs text-secondary">Required</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-icon"
            onClick={onRemove}
            aria-label="Remove question"
            title="Remove question"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Label input */}
      <div
        className="form-group"
        style={{ marginBottom: question.type === "multiple_choice" ? "0.75rem" : 0 }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="Question label…"
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          maxLength={500}
        />
      </div>

      {/* Type-specific editors */}
      {question.type === "multiple_choice" && (
        <MultipleChoiceEditor
          options={question.options}
          onChange={(options) => onUpdate({ options })}
        />
      )}
      {question.type === "rating" && (
        <div className="flex gap-2" style={{ marginTop: "0.5rem", paddingLeft: "0.25rem" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      )}
      {question.type === "short_text" && (
        <div style={{ marginTop: "0.5rem" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Short answer preview…"
            disabled
            style={{ opacity: 0.5 }}
          />
        </div>
      )}
      {question.type === "long_text" && (
        <div style={{ marginTop: "0.5rem" }}>
          <textarea
            className="form-input form-textarea"
            placeholder="Long text answer preview…"
            disabled
            rows={2}
            style={{ opacity: 0.5, resize: "none" }}
          />
        </div>
      )}
      {question.type === "date" && (
        <div style={{ marginTop: "0.5rem" }}>
          <input type="date" className="form-input" disabled style={{ opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}

// ── Multiple Choice Editor ────────────────────────────────────────────────────
function MultipleChoiceEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    onChange(next);
  }
  function addOption() {
    onChange([...options, `Option ${options.length + 1}`]);
  }
  function removeOption(i: number) {
    if (options.length <= 2) return;
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      {options.map((opt, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: options are only added/removed, not reordered by drag
        <div key={i} className="flex gap-2" style={{ alignItems: "center" }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "1.5px solid var(--border)",
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ fontSize: "0.875rem", position: "relative", zIndex: 10 }}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder={`Option ${i + 1}`}
            maxLength={200}
          />
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={() => removeOption(i)}
            disabled={options.length <= 2}
            aria-label="Remove option"
            style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
        onClick={addOption}
        disabled={options.length >= 20}
      >
        + Add option
      </button>
    </div>
  );
}

// ── Branding Panel ────────────────────────────────────────────────────────────
function BrandingPanel({
  primaryColor,
  logoUrl,
  showColorPicker,
  onColorChange,
  onLogoUrlChange,
  onTogglePicker,
  publicId,
}: {
  primaryColor: string;
  logoUrl: string;
  showColorPicker: boolean;
  onColorChange: (c: string) => void;
  onLogoUrlChange: (u: string) => void;
  onTogglePicker: () => void;
  publicId: string;
}) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="card">
      <h4 style={{ marginBottom: "1rem" }}>🎨 Branding</h4>

      {/* Brand colour */}
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label htmlFor="color-picker-trigger" className="form-label">
          Primary colour
        </label>
        <button
          type="button"
          id="color-picker-trigger"
          onClick={onTogglePicker}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.5rem 0.875rem",
            cursor: "pointer",
            width: "100%",
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: primaryColor,
              border: "2px solid rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}
          />
          <span
            className="text-sm"
            style={{ color: "var(--text-primary)", fontFamily: "monospace" }}
          >
            {primaryColor}
          </span>
        </button>
        {showColorPicker && (
          <div
            style={{
              marginTop: "0.5rem",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <HexColorPicker color={primaryColor} onChange={onColorChange} />
          </div>
        )}
      </div>

      {/* Logo URL */}
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label htmlFor="logo-url" className="form-label">
          Logo URL <span className="text-muted">(HTTPS)</span>
        </label>
        <input
          id="logo-url"
          type="url"
          className="form-input"
          placeholder="https://example.com/logo.png"
          value={logoUrl}
          onChange={(e) => {
            onLogoUrlChange(e.target.value);
            setLogoError(false);
          }}
        />
      </div>

      {/* Logo preview */}
      {logoUrl && !logoError && (
        <div
          style={{
            background: "var(--bg-input)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem",
            marginBottom: "1rem",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-xs text-muted" style={{ marginBottom: "0.5rem" }}>
            Preview:
          </p>
          <img
            src={logoUrl}
            alt="Logo preview"
            style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }}
            onError={() => setLogoError(true)}
          />
        </div>
      )}
      {logoUrl && logoError && (
        <p className="text-xs" style={{ color: "var(--warning)", marginBottom: "1rem" }}>
          ⚠️ Could not load image — check the URL
        </p>
      )}

      {/* Live preview strip */}
      <div
        style={{
          background: primaryColor,
          borderRadius: "var(--radius-sm)",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 600,
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          Public survey preview
        </p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
          Your brand colour applied
        </p>
      </div>

      {/* Public link */}
      <div>
        <p className="text-xs text-muted" style={{ marginBottom: "0.25rem" }}>
          Public URL:
        </p>
        <p
          className="text-xs"
          style={{
            fontFamily: "monospace",
            color: "var(--brand-primary)",
            wordBreak: "break-all",
          }}
        >
          /s/{publicId}
        </p>
      </div>
    </div>
  );
}
