import { useState, useEffect } from "react";
import { getSubjectLabel, getSubjectClearBreakdown } from "../utils/subjectClearUtils";

export default function SubjectClearModal({
  isOpen,
  onClose,
  classData,
  selectedSubjectIdx,
  onSelectSubjectIdx,
  onConfirmClear,
  isClearing
}) {
  const [clearMode, setClearMode] = useState("all");

  useEffect(() => {
    if (isOpen) {
      setClearMode("all");
    }
  }, [isOpen, selectedSubjectIdx]);

  if (!isOpen || !classData) return null;

  const subjects = classData.subjects || [];
  const safeIdx = selectedSubjectIdx >= 0 && selectedSubjectIdx < subjects.length ? selectedSubjectIdx : 0;
  const breakdown = getSubjectClearBreakdown(classData, safeIdx);
  const affectedCount = breakdown[clearMode] || 0;

  const modeOptions = [
    {
      id: "all",
      icon: "🧹",
      title: "Clear ALL Marks",
      desc: "Wipes every entered mark for this subject back to blank (\"\").",
      count: breakdown.all,
      accent: "#ef4444"
    },
    {
      id: "absent",
      icon: "🚫",
      title: "Clear ONLY Absent (AB / A)",
      desc: "Clears only students marked as AB or A. Numeric/other marks stay untouched.",
      count: breakdown.absent,
      accent: "#f59e0b"
    },
    {
      id: "fail",
      icon: "❌",
      title: "Clear ONLY Fail Marks",
      desc: classData.examName === "ESE"
        ? "Clears absent & failed grades (U, U*, FAIL, AB). Passed grades stay untouched."
        : `Clears absent & marks below pass mark (< ${classData.passMark}). Passed marks stay untouched.`,
      count: breakdown.fail,
      accent: "#8b5cf6"
    }
  ];

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 10050
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isClearing) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--bg-card, #ffffff)",
          color: "var(--text-main, #0f172a)",
          borderRadius: "16px",
          border: "1px solid var(--border-color, rgba(148, 163, 184, 0.35))",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(245, 158, 11, 0.1))",
            borderBottom: "1px solid var(--border-color, rgba(148, 163, 184, 0.25))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: "800",
                letterSpacing: "0.8px",
                padding: "3px 8px",
                borderRadius: "999px",
                background: "rgba(239, 68, 68, 0.16)",
                color: "#ef4444",
                marginBottom: "6px"
              }}
            >
              ADMIN ONLY • SMART SUBJECT MARK CLEANER
            </span>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>
              Clear Single Subject Marks
            </h3>
          </div>
          <button
            type="button"
            disabled={isClearing}
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #64748b)",
              fontSize: "20px",
              cursor: isClearing ? "not-allowed" : "pointer",
              padding: "4px 8px"
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Class & Exam Info */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "var(--bg-main, rgba(148, 163, 184, 0.1))",
              border: "1px solid var(--border-color, rgba(148, 163, 184, 0.25))",
              fontSize: "0.85rem",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "8px"
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted, #64748b)" }}>Class: </span>
              <strong>{classData.className}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted, #64748b)" }}>Exam: </span>
              <strong>{classData.examName}</strong>
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "700",
                fontSize: "0.85rem",
                marginBottom: "6px"
              }}
            >
              Target Subject ({subjects.length} subjects)
            </label>
            <select
              className="select-input"
              value={safeIdx}
              disabled={isClearing}
              onChange={(e) => onSelectSubjectIdx(Number(e.target.value))}
              style={{ width: "100%", fontWeight: "600" }}
            >
              {subjects.map((_, idx) => (
                <option key={idx} value={idx}>
                  {getSubjectLabel(classData, idx)}
                </option>
              ))}
            </select>
            <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
              Students in class: <strong>{breakdown.totalStudents}</strong> | Entered: <strong>{breakdown.all}</strong> | Absent: <strong>{breakdown.absent}</strong> | Fail: <strong>{breakdown.fail}</strong>
            </div>
          </div>

          {/* Clear Filter Mode Options (Option 2) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontWeight: "700", fontSize: "0.85rem" }}>
              Choose What to Clear:
            </label>
            {modeOptions.map((opt) => {
              const isSelected = clearMode === opt.id;
              return (
                <label
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    cursor: isClearing ? "not-allowed" : "pointer",
                    border: isSelected
                      ? `2px solid ${opt.accent}`
                      : "1px solid var(--border-color, rgba(148, 163, 184, 0.35))",
                    background: isSelected ? "rgba(239, 68, 68, 0.06)" : "transparent",
                    transition: "all 0.15s ease"
                  }}
                >
                  <input
                    type="radio"
                    name="subjectClearMode"
                    value={opt.id}
                    checked={isSelected}
                    disabled={isClearing}
                    onChange={() => setClearMode(opt.id)}
                    style={{ marginTop: "3px", accentColor: opt.accent }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "0.92rem" }}>
                        {opt.icon} {opt.title}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: opt.count > 0 ? "rgba(239, 68, 68, 0.14)" : "rgba(148, 163, 184, 0.2)",
                          color: opt.count > 0 ? opt.accent : "var(--text-muted, #64748b)"
                        }}
                      >
                        {opt.count} cell{opt.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                      {opt.desc}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Safety Reassurance */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: "0.8rem",
              color: "#059669"
            }}
          >
            🛡️ <strong>Safe Clear:</strong> Only this subject&apos;s marks will be cleared (other subjects stay untouched). A backup snapshot is saved so you can click <strong>↩️ Undo Last Clear</strong> right after if needed.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border-color, rgba(148, 163, 184, 0.25))",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px"
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isClearing}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isClearing || affectedCount === 0}
            onClick={() => onConfirmClear(safeIdx, clearMode)}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              background: isClearing || affectedCount === 0 ? "#9ca3af" : "#dc2626",
              color: "#ffffff",
              fontWeight: "700",
              cursor: isClearing || affectedCount === 0 ? "not-allowed" : "pointer",
              fontSize: "0.9rem"
            }}
          >
            {isClearing
              ? "Clearing..."
              : affectedCount === 0
              ? "Nothing to Clear"
              : `Confirm & Clear (${affectedCount} Marks)`}
          </button>
        </div>
      </div>
    </div>
  );
}

