import { useState } from 'react';
import axios from 'axios';
import '../styles/StudentResults.css';

export default function StudentResults() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/students/all');
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load student data');
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container">
      <h2>OFFICE OF THE CONTROLLER OF EXAMINATIONS</h2>
      <h3>RESULT ANALYSIS</h3>
      <h2>Student Results</h2>

      <div className="button-group">
        <button onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Load Data'}
        </button>
        <button onClick={handlePrint}>Print</button>
      </div>

      {students.length > 0 && (
        <table className="results-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Reg No</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Result</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={index}>
                <td>{student.name}</td>
                <td>{student.regNo}</td>
                <td>{student.total}</td>
                <td>{student.percentage.toFixed(2)}</td>
                <td>{student.result}</td>
                <td>{student.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
