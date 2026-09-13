import { useState } from "react";
import ConsolidatedAttendanceReport from "./ConsolidatedAttendanceReport";
import RegularGridReport from "./RegularGridReport";
import IndividualStudentTracker from "./IndividualStudentTracker";

export default function AttendanceReportsContainer() {
  const [reportTab, setReportTab] = useState("consolidated");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }} className="no-print">
        <button 
          className={`btn ${reportTab === "consolidated" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setReportTab("consolidated")}
        >
          Consolidated Report
        </button>
        <button 
          className={`btn ${reportTab === "grid" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setReportTab("grid")}
        >
          Regular Grid Report
        </button>
        <button 
          className={`btn ${reportTab === "student" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setReportTab("student")}
        >
          Individual Student Tracker
        </button>
      </div>

      {reportTab === "consolidated" && <ConsolidatedAttendanceReport />}
      {reportTab === "grid" && <RegularGridReport />}
      {reportTab === "student" && <IndividualStudentTracker />}
    </div>
  );
}
