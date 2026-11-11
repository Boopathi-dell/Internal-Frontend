import React, { useState, useEffect } from "react";
import API from "../api";
import { Plus, Trash, Save, Settings, FileText, Calculator, X, Sigma } from "lucide-react";
import { Check } from "lucide-react";

export default function InternalMarkTemplateSetup() {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableExams, setAvailableExams] = useState([]);
  const [headerImage, setHeaderImage] = useState(() => localStorage.getItem("internalMarkHeaderImage") || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchAvailableExams();
    fetchHeaderImage();
  }, []);

  const fetchHeaderImage = async () => {
    try {
      const res = await API.get("/api/internal-marks/header-image");
      if (res.data && res.data.headerImage) {
        setHeaderImage(res.data.headerImage);
        localStorage.setItem("internalMarkHeaderImage", res.data.headerImage);
      } else {
        // Fallback to letter template headerLogo if available
        const letterRes = await API.get("/api/letter-template");
        if (letterRes.data && letterRes.data.headerLogo) {
          setHeaderImage(letterRes.data.headerLogo);
        }
      }
    } catch (e) {
      console.error("Error fetching internal marks header image:", e);
    }
  };

  const handleHeaderImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setHeaderImage(base64);
        localStorage.setItem("internalMarkHeaderImage", base64);
        try {
          await API.post("/api/internal-marks/header-image", { headerImage: base64 });
          alert("College Header Image saved successfully! It will now appear on all printed internal mark sheets.");
        } catch (err) {
          console.error("Failed to save header image:", err);
          alert("Header image saved locally.");
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveHeaderImage = async () => {
    if (!window.confirm("Remove this header image?")) return;
    setHeaderImage("");
    localStorage.removeItem("internalMarkHeaderImage");
    try {
      await API.post("/api/internal-marks/header-image", { headerImage: "" });
    } catch (err) {
      console.error("Failed to remove header image:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await API.get("/api/internal-marks");
      setTemplates(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchAvailableExams = async () => {
    try {
      const res = await API.get("/api/classes");
      const uniqueExams = [...new Set(res.data.map(c => c.examName).filter(Boolean))];
      const defaults = [
        "Unit Test - I", "Unit Test - II", "CIA - I", 
        "Unit Test - III", "Unit Test - IV", "CIA - II", 
        "Unit Test - V", "Model Exam", "CIA - III", 
        "UNIT I", "UNIT II", "UNIT III", "UNIT IV", "UNIT V", "CIA I", "CIA II", "CIA III",
        "Seminar", "SEMINAR", "MKC"
      ];
      setAvailableExams([...new Set([...uniqueExams, ...defaults])]);
    } catch (err) {
      console.error(err);
      setAvailableExams([
        "Unit Test - I", "Unit Test - II", "CIA - I", 
        "Unit Test - III", "Unit Test - IV", "CIA - II", 
        "Unit Test - V", "Model Exam", "CIA - III",
        "Seminar", "MKC"
      ]);
    }
  };

  const handleAddNewTemplate = () => {
    setEditingTemplate({
      templateName: "Theory Internal Mark Format",
      regulation: "2023",
      courseCategory: "Theory",
      printOrientation: "landscape",
      passMark: 20,
      isActive: false,
      columns: [
        { heading: "UT-1 (30)", type: "exam", examName: "Unit Test - I", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false }
      ]
    });
  };

  // Official MEC 14-Column / 40-Mark Internal Mark Template Preset (Exact Excel Format)
  const handleLoadMecStandardTemplate = () => {
    setEditingTemplate({
      templateName: "MEC Official Theory Internal Mark Format (40 Marks)",
      regulation: "2023",
      courseCategory: "Theory",
      printOrientation: "landscape",
      passMark: 20,
      isActive: true,
      columns: [
        { heading: "UT-1 (30)", type: "exam", examName: "Unit Test - I", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false },
        { heading: "UT-2 (30)", type: "exam", examName: "Unit Test - II", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false },
        { heading: "CIA1 (50)", type: "exam", examName: "CIA - I", formula: "", calcSources: [], calcType: "scale", calcOutof: 50, calcWeightage: 50, isHidden: false },
        { heading: "IM (10)", type: "calculation", examName: "", formula: "(#[UT-1 (30)] + #[UT-2 (30)] + #[CIA1 (50)]) / 110 * 10", calcSources: ["UT-1 (30)", "UT-2 (30)", "CIA1 (50)"], calcType: "scale", calcOutof: 110, calcWeightage: 10, isHidden: false },
        { heading: "UT-3 (30)", type: "exam", examName: "Unit Test - III", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false },
        { heading: "UT-4 (30)", type: "exam", examName: "Unit Test - IV", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false },
        { heading: "CIA2 (50)", type: "exam", examName: "CIA - II", formula: "", calcSources: [], calcType: "scale", calcOutof: 50, calcWeightage: 50, isHidden: false },
        { heading: "IM (10)", type: "calculation", examName: "", formula: "(#[UT-3 (30)] + #[UT-4 (30)] + #[CIA2 (50)]) / 110 * 10", calcSources: ["UT-3 (30)", "UT-4 (30)", "CIA2 (50)"], calcType: "scale", calcOutof: 110, calcWeightage: 10, isHidden: false },
        { heading: "UT-5 (30)", type: "exam", examName: "Unit Test - V", formula: "", calcSources: [], calcType: "scale", calcOutof: 30, calcWeightage: 30, isHidden: false },
        { heading: "CIA3 (100)", type: "exam", examName: "Model Exam", formula: "", calcSources: [], calcType: "scale", calcOutof: 100, calcWeightage: 100, isHidden: false },
        { heading: "IM (10)", type: "calculation", examName: "", formula: "(#[UT-5 (30)] + #[CIA3 (100)]) / 130 * 10", calcSources: ["UT-5 (30)", "CIA3 (100)"], calcType: "scale", calcOutof: 130, calcWeightage: 10, isHidden: false },
        { heading: "SM (5)", type: "exam", examName: "Seminar", formula: "", calcSources: [], calcType: "scale", calcOutof: 5, calcWeightage: 5, isHidden: false },
        { heading: "MKC (5)", type: "exam", examName: "MKC", formula: "", calcSources: [], calcType: "scale", calcOutof: 5, calcWeightage: 5, isHidden: false },
        { heading: "TOTAL (40)", type: "calculation", examName: "", formula: "(#[IM (10) ::1] + #[IM (10) ::2] + #[IM (10) ::3] + #[SM (5)] + #[MKC (5)])", calcSources: ["IM (10) ::1", "IM (10) ::2", "IM (10) ::3", "SM (5)", "MKC (5)"], calcType: "sum", calcOutof: 40, calcWeightage: 40, isHidden: false }
      ]
    });
  };

  const handleSaveTemplate = async () => {
    try {
      const brokenCalcCols = [];
      const preparedColumns = (editingTemplate.columns || []).map((col, idx) => {
        const nextCol = { ...col, isHidden: Boolean(col.isHidden) };
        if (nextCol.type === "calculation") {
          if (nextCol.calcType === "custom" && nextCol.formula && nextCol.formula.trim()) {
            nextCol.type = "formula";
            return nextCol;
          }
          const validSources = Array.isArray(nextCol.calcSources) ? nextCol.calcSources.filter(Boolean) : [];
          if (validSources.length === 0) {
            brokenCalcCols.push(nextCol.heading || `Column ${idx + 1}`);
          }
          const sumPart = validSources.map(s => `#[${s}]`).join(" + ");
          const safeOutof = Number(nextCol.calcOutof) > 0 ? Number(nextCol.calcOutof) : 1;
          const safeWeightage = Number(nextCol.calcWeightage) >= 0 && nextCol.calcWeightage !== "" ? Number(nextCol.calcWeightage) : 1;
          if (nextCol.calcType === "sum") {
            nextCol.formula = `(${sumPart || "0"})`;
          } else {
            nextCol.formula = `(${sumPart || "0"}) / ${safeOutof} * ${safeWeightage}`;
            nextCol.calcOutof = safeOutof;
            nextCol.calcWeightage = safeWeightage;
          }
          nextCol.type = "formula";
        }
        return nextCol;
      });

      if (brokenCalcCols.length > 0) {
        const proceed = window.confirm(
          `Warning: The following calculated column(s) have NO source columns selected and will evaluate to 0:\n\n• ${brokenCalcCols.join("\n• ")}\n\nClick Cancel to pick source columns first, or OK to save anyway.`
        );
        if (!proceed) return;
      }

      const dataToSave = {
        ...editingTemplate,
        columns: preparedColumns,
        passMark: editingTemplate.passMark === "" || editingTemplate.passMark === undefined
          ? 0
          : Math.max(0, Number(editingTemplate.passMark) || 0)
      };

      if (editingTemplate._id) {
        await API.put(`/api/internal-marks/${editingTemplate._id}`, dataToSave);
      } else {
        await API.post("/api/internal-marks", dataToSave);
      }

      // Clear any local browser column-visibility overrides so Admin template visibility takes immediate effect
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("internalMarkHiddenCols_")) {
            localStorage.removeItem(key);
          }
        });
      } catch {
        // Ignore storage errors
      }

      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await API.delete(`/api/internal-marks/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert("Failed to delete template.");
    }
  };

  const handleAddColumn = (type) => {
    setEditingTemplate(prev => ({
      ...prev,
      columns: [...prev.columns, { 
        heading: type === "exam" ? "New Exam" : "New Calculation", 
        type: type === "exam" ? "exam" : "calculation", 
        examName: "", 
        formula: "",
        isHidden: false,
        calcSources: [],
        calcType: "scale",
        calcOutof: 110,
        calcWeightage: 10
      }]
    }));
  };

  // Builds a unique token when duplicate column headings exist (e.g., multiple "IM (10)")
  const getColSourceInfo = (colsBefore, targetIdx) => {
    const targetHeading = colsBefore[targetIdx]?.heading || "";
    const matchingAll = colsBefore.filter(c => c.heading === targetHeading);
    if (matchingAll.length <= 1) {
      return { token: targetHeading, label: targetHeading || `Column ${targetIdx + 1}` };
    }
    const occ = colsBefore.slice(0, targetIdx + 1).filter(c => c.heading === targetHeading).length;
    return {
      token: `${targetHeading} ::${occ}`,
      label: `${targetHeading} (#${occ})`
    };
  };

  // Remaps existing calcSources tokens after a column heading edit or deletion without index drift
  const remapCalcSources = (oldColumns, newColumns, removedIdx = -1) => {
    const resolveOldIndex = (colsBefore, token) => {
      for (let i = 0; i < colsBefore.length; i++) {
        if (getColSourceInfo(colsBefore, i).token === token) return i;
      }
      return colsBefore.findIndex(c => c.heading === token);
    };

    const resolvedPerCol = oldColumns.map((col, j) => {
      if (!Array.isArray(col.calcSources)) return null;
      const colsBefore = oldColumns.slice(0, j);
      return col.calcSources.map(src => ({ raw: src, oldIdx: resolveOldIndex(colsBefore, src) }));
    });

    return newColumns.map((col, newJ) => {
      const oldJ = removedIdx !== -1 && newJ >= removedIdx ? newJ + 1 : newJ;
      const refs = resolvedPerCol[oldJ];
      if (!refs) return col;

      const updatedColsBefore = newColumns.slice(0, newJ);
      const nextSources = [];
      refs.forEach(({ raw, oldIdx }) => {
        if (oldIdx === -1) {
          nextSources.push(raw);
          return;
        }
        if (removedIdx !== -1 && oldIdx === removedIdx) return;
        const mappedIdx = removedIdx !== -1 && oldIdx > removedIdx ? oldIdx - 1 : oldIdx;
        if (mappedIdx >= 0 && mappedIdx < newJ) {
          nextSources.push(getColSourceInfo(updatedColsBefore, mappedIdx).token);
        }
      });
      return { ...col, calcSources: nextSources };
    });
  };

  const handleColumnChange = (index, field, value) => {
    const oldColumns = editingTemplate.columns;
    const newColumns = oldColumns.map((c, idx) => (idx === index ? { ...c, [field]: value } : { ...c }));
    const updated = field === "heading" ? remapCalcSources(oldColumns, newColumns) : newColumns;
    setEditingTemplate(prev => ({ ...prev, columns: updated }));
  };

  const toggleCalcSource = (colIndex, sourceToken) => {
    const newColumns = [...editingTemplate.columns];
    const sources = newColumns[colIndex].calcSources || [];
    if (sources.includes(sourceToken)) {
      newColumns[colIndex].calcSources = sources.filter(s => s !== sourceToken);
    } else {
      newColumns[colIndex].calcSources = [...sources, sourceToken];
    }
    setEditingTemplate(prev => ({ ...prev, columns: newColumns }));
  };

  const handleRemoveColumn = (index) => {
    const oldColumns = editingTemplate.columns;
    const newColumns = oldColumns.filter((_, i) => i !== index).map(c => ({ ...c }));
    const updated = remapCalcSources(oldColumns, newColumns, index);
    setEditingTemplate(prev => ({ ...prev, columns: updated }));
  };

  const parseExistingFormula = (template) => {
    const inferredCategory = template.courseCategory || (/\blab\b|laboratory|practical/i.test(template.templateName || "") ? "Lab" : "Theory");
    const cloned = {
      ...template,
      courseCategory: inferredCategory,
      printOrientation: template.printOrientation || (inferredCategory === "Lab" ? "portrait" : "landscape")
    };
    const normalizeParsedSources = (rawSources, colsBefore) => {
      const seenLegacy = {};
      return rawSources.map(raw => {
        const cleanedRaw = (raw || "").trim();
        if (/::\d+$/.test(cleanedRaw)) {
          const base = cleanedRaw.replace(/\s*::\d+$/, "").trim();
          const occ = cleanedRaw.match(/::(\d+)$/)[1];
          const matched = colsBefore.find(c => (c.heading || "").trim().toLowerCase() === base.toLowerCase());
          return matched ? `${matched.heading} ::${occ}` : cleanedRaw;
        }
        const matchedCols = colsBefore.filter(c => (c.heading || "").trim().toLowerCase() === cleanedRaw.toLowerCase());
        const exactHeading = matchedCols[0]?.heading || cleanedRaw;
        if (matchedCols.length > 1) {
          seenLegacy[exactHeading] = (seenLegacy[exactHeading] || 0) + 1;
          return `${exactHeading} ::${Math.min(seenLegacy[exactHeading], matchedCols.length)}`;
        }
        return exactHeading;
      });
    };

    const extractTokens = (str) => [...(str || "").matchAll(/#\[(.*?)\]/g)].map(m => m[1]);

    cloned.columns = cloned.columns.map((col, colIdx) => {
      const nextCol = { ...col };
      if (nextCol.type === "formula" || nextCol.type === "calculation") {
        nextCol.type = "calculation";
        const colsBefore = cloned.columns.slice(0, colIdx);
        if (Array.isArray(nextCol.calcSources) && nextCol.calcSources.length > 0 && nextCol.calcType !== "custom") {
          nextCol.calcSources = normalizeParsedSources(nextCol.calcSources, colsBefore);
          nextCol.calcOutof = nextCol.calcOutof || 50;
          nextCol.calcWeightage = nextCol.calcWeightage ?? 10;
          return nextCol;
        }

        const rawFormula = (nextCol.formula || "").trim();
        const scaleDivMul = rawFormula.match(/^\(?([\s\S]*?)\)?\s*\/\s*([\d.]+)\s*\*\s*([\d.]+)$/);
        const scaleMulDiv = rawFormula.match(/^\(?([\s\S]*?)\)?\s*\*\s*([\d.]+)\s*\/\s*([\d.]+)$/);
        const scaleDivOnly = rawFormula.match(/^\(?([\s\S]*?)\)?\s*\/\s*([\d.]+)$/);
        const tokensAll = extractTokens(rawFormula);
        const isPureSumExpr = tokensAll.length > 0 && /^[\s()+]*$/.test(rawFormula.replace(/#\[.*?\]/g, ""));

        if (scaleDivMul && extractTokens(scaleDivMul[1]).length > 0) {
          nextCol.calcSources = normalizeParsedSources(extractTokens(scaleDivMul[1]), colsBefore);
          nextCol.calcType = "scale";
          nextCol.calcOutof = parseFloat(scaleDivMul[2]);
          nextCol.calcWeightage = parseFloat(scaleDivMul[3]);
        } else if (scaleMulDiv && extractTokens(scaleMulDiv[1]).length > 0) {
          nextCol.calcSources = normalizeParsedSources(extractTokens(scaleMulDiv[1]), colsBefore);
          nextCol.calcType = "scale";
          nextCol.calcOutof = parseFloat(scaleMulDiv[3]);
          nextCol.calcWeightage = parseFloat(scaleMulDiv[2]);
        } else if (scaleDivOnly && extractTokens(scaleDivOnly[1]).length > 0) {
          nextCol.calcSources = normalizeParsedSources(extractTokens(scaleDivOnly[1]), colsBefore);
          nextCol.calcType = "scale";
          nextCol.calcOutof = parseFloat(scaleDivOnly[2]);
          nextCol.calcWeightage = 1;
        } else if (isPureSumExpr) {
          nextCol.calcSources = normalizeParsedSources(tokensAll, colsBefore);
          nextCol.calcType = "sum";
          nextCol.calcOutof = 100;
          nextCol.calcWeightage = 10;
        } else if (tokensAll.length > 0) {
          nextCol.calcSources = normalizeParsedSources(tokensAll, colsBefore);
          nextCol.calcType = "custom";
          nextCol.calcOutof = 100;
          nextCol.calcWeightage = 10;
        } else {
          nextCol.calcSources = [];
          nextCol.calcType = "scale";
          nextCol.calcOutof = 50;
          nextCol.calcWeightage = 10;
        }
      }
      return nextCol;
    });
    setEditingTemplate(cloned);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1rem", color: "var(--primary)" }}>Internal Mark Templates</h2>
      
      {!editingTemplate ? (
        <div>
          {/* HEADER IMAGE BANNER UPLOAD CARD (EXACTLY LIKE LETTER TEMPLATE) */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: "bold", color: "var(--text-color)" }}>College Header Image / Banner</h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Upload a college header banner image. This image will automatically reflect at the top of the printed internal mark sheets.
                </p>
              </div>
              <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <span>{uploadingImage ? "Uploading..." : "Upload Header Banner"}</span>
                <input type="file" accept="image/*" onChange={handleHeaderImageUpload} style={{ display: "none" }} />
              </label>
            </div>

            {headerImage ? (
              <div style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center", position: "relative" }}>
                <img src={headerImage} alt="Header Preview" style={{ maxHeight: "80px", maxWidth: "100%", objectFit: "contain" }} />
                <button 
                  onClick={handleRemoveHeaderImage} 
                  className="btn btn-danger btn-sm" 
                  style={{ position: "absolute", top: "10px", right: "10px", padding: "3px 8px", fontSize: "0.75rem" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "8px", border: "1px dashed rgba(99, 102, 241, 0.3)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No custom header banner uploaded yet. The default Muthayammal College logo + institution text header will be printed.
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={handleAddNewTemplate} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Plus size={16} /> Create Blank Template
              </button>
              <button 
                onClick={handleLoadMecStandardTemplate} 
                className="btn btn-primary" 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "8px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  fontWeight: "bold"
                }}
              >
                <span>⭐</span> Load Official MEC 14-Column Preset (40 Marks)
              </button>
            </div>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Regulation</th>
                <th>Type &amp; Print</th>
                <th>Pass Mark</th>
                <th>Status</th>
                <th>Columns</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => {
                const cat = t.courseCategory || (/\blab\b|laboratory|practical/i.test(t.templateName || "") ? "Lab" : "Theory");
                const orient = t.printOrientation || (cat === "Lab" ? "portrait" : "landscape");
                return (
                <tr key={t._id}>
                  <td style={{ fontWeight: "bold" }}>{t.templateName}</td>
                  <td>{t.regulation || "N/A"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{
                        background: cat === "Lab" ? "rgba(236, 72, 153, 0.12)" : "rgba(99, 102, 241, 0.12)",
                        color: cat === "Lab" ? "#db2777" : "#4f46e5",
                        padding: "3px 9px",
                        borderRadius: "99px",
                        fontWeight: "700",
                        fontSize: "0.75rem"
                      }}>
                        {cat === "Lab" ? "🧪 Lab" : "📘 Theory"}
                      </span>
                      <span style={{
                        background: "rgba(100, 116, 139, 0.1)",
                        color: "#475569",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        fontSize: "0.72rem"
                      }}>
                        {orient === "portrait" ? "Portrait" : "Landscape"}
                      </span>
                    </div>
                  </td>
                  <td>
                    {Number(t.passMark) > 0 ? (
                      <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", padding: "3px 10px", borderRadius: "99px", fontWeight: "700", fontSize: "0.82rem" }}>
                        {t.passMark}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Not Set</span>
                    )}
                  </td>
                  <td>
                    {t.isActive ? 
                      <span style={{ background: "rgba(34, 197, 94, 0.2)", color: "#16a34a", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold", fontSize: "0.8rem" }}>Active</span> 
                      : <span style={{ color: "var(--text-muted)" }}>Inactive</span>}
                  </td>
                  <td>{t.columns.length} columns</td>
                  <td>
                    <button onClick={() => parseExistingFormula(t)} className="btn btn-secondary btn-sm" style={{ marginRight: "0.5rem" }}>Edit Format</button>
                    <button onClick={() => handleDeleteTemplate(t._id)} className="btn btn-danger btn-sm"><Trash size={14} /></button>
                  </td>
                </tr>
                );
              })}
              {templates.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No templates created yet. Click above to make one!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Template Name (E.g. ODD SEM 2026)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingTemplate.templateName}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, templateName: e.target.value })}
                  style={{ fontSize: "1.05rem", padding: "10px", width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ width: "155px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Regulation</label>
                <input 
                  type="text"
                  list="reg-options-admin"
                  className="input-field" 
                  value={editingTemplate.regulation || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, regulation: e.target.value })}
                  style={{ fontSize: "1.05rem", padding: "10px", width: "100%", boxSizing: "border-box" }}
                  placeholder="Enter Regulation"
                />
                <datalist id="reg-options-admin">
                  {["2019", "2021", "2023", "2025"].map(r => <option key={r} value={r}>{r}</option>)}
                </datalist>
              </div>
              <div style={{ width: "155px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Template Type</label>
                <select
                  className="input-field"
                  value={editingTemplate.courseCategory || "Theory"}
                  onChange={(e) => {
                    const nextCat = e.target.value;
                    setEditingTemplate({
                      ...editingTemplate,
                      courseCategory: nextCat,
                      printOrientation: nextCat === "Lab" ? "portrait" : "landscape"
                    });
                  }}
                  style={{ fontSize: "1rem", padding: "10px", width: "100%", boxSizing: "border-box", fontWeight: "600" }}
                >
                  <option value="Theory">📘 Theory</option>
                  <option value="Lab">🧪 Lab / Practical</option>
                </select>
              </div>
              <div style={{ width: "165px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Print Layout</label>
                <select
                  className="input-field"
                  value={editingTemplate.printOrientation || (editingTemplate.courseCategory === "Lab" ? "portrait" : "landscape")}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, printOrientation: e.target.value })}
                  style={{ fontSize: "1rem", padding: "10px", width: "100%", boxSizing: "border-box", fontWeight: "600" }}
                >
                  <option value="landscape">A4 Landscape</option>
                  <option value="portrait">A4 Portrait</option>
                </select>
              </div>
              <div style={{ width: "175px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem", color: "#dc2626" }}>
                  Internal Pass Mark
                </label>
                <input 
                  type="number"
                  min="0"
                  className="input-field" 
                  value={editingTemplate.passMark ?? 0}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, passMark: e.target.value })}
                  style={{ fontSize: "1.05rem", padding: "10px", width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. 20 (out of 40)"
                />
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Students below this highlight red on screen (Print remains B&amp;W)
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(99, 102, 241, 0.1)", padding: "10px 15px", borderRadius: "8px", cursor: "pointer", border: "1px solid var(--primary)", color: "var(--primary)", fontWeight: "bold", marginTop: "24px" }}>
                <input 
                  type="checkbox" 
                  checked={editingTemplate.isActive} 
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                  style={{ width: "20px", height: "20px" }}
                />
                Active for {editingTemplate.courseCategory || "Theory"} (Reg {editingTemplate.regulation || "..."})
              </label>
            </div>
          </div>

          <h3 style={{ marginBottom: "1rem" }}>Define Columns (Left to Right)</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {editingTemplate.columns.map((col, index) => (
              <div key={index} style={{ 
                background: "var(--bg-secondary)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "12px", 
                padding: "1.5rem",
                position: "relative"
              }}>
                <button 
                  onClick={() => handleRemoveColumn(index)} 
                  style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}
                  title="Remove Column"
                >
                  <X size={20} />
                </button>

                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ background: "var(--primary)", color: "white", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontWeight: "bold" }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Column Heading (Visible on Printout)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="E.g. UNIT I (30) or TOTAL (40)" 
                      value={col.heading} 
                      onChange={(e) => handleColumnChange(index, 'heading', e.target.value)}
                    />
                    <div style={{ marginTop: "6px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold", color: col.isHidden ? "#ef4444" : "#16a34a", background: col.isHidden ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)", padding: "3px 10px", borderRadius: "14px", border: col.isHidden ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)" }}>
                        <input 
                          type="checkbox" 
                          checked={col.isHidden || false} 
                          onChange={(e) => handleColumnChange(index, 'isHidden', e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        {col.isHidden ? "Hidden from Mark Sheet (Used for Backend Formulas Only)" : "Visible on Mark Sheet"}
                      </label>
                    </div>
                  </div>
                  <div style={{ width: "200px" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Column Type</label>
                    <div style={{ padding: "8px", background: "rgba(0,0,0,0.1)", borderRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {col.type === "exam" ? <FileText size={16} className="text-primary" /> : <Calculator size={16} className="text-success" />}
                      {col.type === "exam" ? "Fetch Exam Marks" : "Auto Calculation"}
                    </div>
                  </div>
                </div>

                {col.type === "exam" && (
                  <div style={{ background: "var(--bg-main)", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid var(--primary)" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>Which Exam's marks should be shown here?</label>
                    <select 
                      className="input-field" 
                      value={col.examName} 
                      onChange={(e) => handleColumnChange(index, 'examName', e.target.value)}
                      style={{ maxWidth: "300px" }}
                    >
                      <option value="">-- Select Exam --</option>
                      {availableExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      <option value="SEMINAR">SEMINAR</option>
                      <option value="MKC">MKC</option>
                    </select>
                  </div>
                )}

                {col.type === "calculation" && (
                  <div style={{ background: "var(--bg-main)", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
                    <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold" }}>
                        <input type="radio" name={`calcType-${index}`} checked={col.calcType === "scale" || !col.calcType} onChange={() => handleColumnChange(index, 'calcType', 'scale')} />
                        Convert &amp; Scale (E.g. Convert to 10 marks)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold", color: "var(--primary)" }}>
                        <input type="radio" name={`calcType-${index}`} checked={col.calcType === "sum"} onChange={() => handleColumnChange(index, 'calcType', 'sum')} />
                        <Sigma size={16} /> Direct Sum (Final Total)
                      </label>
                      {col.calcType === "custom" && (
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold", color: "#d97706" }}>
                          <input type="radio" name={`calcType-${index}`} checked={col.calcType === "custom"} onChange={() => handleColumnChange(index, 'calcType', 'custom')} />
                          Custom Formula
                        </label>
                      )}
                    </div>

                    {col.calcType === "custom" ? (
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.4rem" }}>Custom Expression (`#[Column Heading]`)</label>
                        <input
                          type="text"
                          className="input-field"
                          value={col.formula || ""}
                          onChange={(e) => handleColumnChange(index, 'formula', e.target.value)}
                          placeholder="e.g. (#[CIA I] * 0.2)"
                        />
                      </div>
                    ) : (
                      <>
                        <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>1. Which columns should be added together?</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                          {editingTemplate.columns.slice(0, index).map((prevCol, i) => {
                            const colsBefore = editingTemplate.columns.slice(0, index);
                            const { token, label } = getColSourceInfo(colsBefore, i);
                            const isSelected = (col.calcSources || []).includes(token);
                            return (
                              <label key={i} style={{ 
                                padding: "6px 12px", 
                                background: isSelected ? "var(--primary)" : "var(--bg-secondary)", 
                                color: isSelected ? "white" : "inherit",
                                borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem", border: "1px solid var(--border-color)",
                                display: "flex", alignItems: "center", gap: "0.5rem"
                              }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleCalcSource(index, token)}
                                  style={{ display: "none" }}
                                />
                                {isSelected && <Check size={14} />}
                                {label}
                              </label>
                            );
                          })}
                          {index === 0 && <span style={{ fontSize: "0.85rem", color: "var(--danger)" }}>No previous columns available to add!</span>}
                        </div>

                        {(!col.calcType || col.calcType === "scale") && (
                          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginTop: "1rem" }}>
                            <div>
                              <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>2. Total Max Marks of selected</label>
                              <input type="number" className="input-field" value={col.calcOutof} onChange={(e) => handleColumnChange(index, 'calcOutof', e.target.value)} style={{ width: "150px" }} />
                            </div>
                            <div style={{ fontSize: "1.5rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>👉</div>
                            <div>
                              <label style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>3. Convert to Weightage</label>
                              <input type="number" className="input-field" value={col.calcWeightage} onChange={(e) => handleColumnChange(index, 'calcWeightage', e.target.value)} style={{ width: "150px" }} />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div style={{
                      marginTop: "1rem",
                      padding: "10px",
                      background: (col.calcType !== "custom" && (!col.calcSources || col.calcSources.length === 0)) ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                      color: (col.calcType !== "custom" && (!col.calcSources || col.calcSources.length === 0)) ? "#dc2626" : "#10b981",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: "bold"
                    }}>
                      {col.calcType === "custom" ? (
                        <>Formula: {col.formula || "(empty)"}</>
                      ) : (!col.calcSources || col.calcSources.length === 0) ? (
                        <>⚠ Select at least 1 column above — otherwise this column will calculate as 0!</>
                      ) : col.calcType === "sum" ? (
                        <>Formula: Sum of ({col.calcSources.join(" + ")})</>
                      ) : (
                        <>Formula: ({col.calcSources.join(" + ")}) / {col.calcOutof} × {col.calcWeightage}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button onClick={() => handleAddColumn("exam")} className="btn" style={{ background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", border: "1px dashed var(--primary)" }}>
              <Plus size={16} /> Add Exam Column
            </button>
            <button onClick={() => handleAddColumn("calculation")} className="btn" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px dashed #10b981" }}>
              <Calculator size={16} /> Add Calculated Column
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
            <button onClick={handleSaveTemplate} className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}><Save size={18} style={{ marginRight: "8px" }} /> Save Template</button>
            <button onClick={() => setEditingTemplate(null)} className="btn btn-secondary" style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
