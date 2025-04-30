import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import "./Scheduler.css";
const colorPalette = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#0ea5e9", "#22c55e", "#eab308", "#6366f1"
];


Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Scheduler = () => {
  const [algorithm, setAlgorithm] = useState("fcfs");
  const [processes, setProcesses] = useState([]); // Holds the list of processes
  const [newProcess, setNewProcess] = useState({ processId: "", arrivalTime: "", burstTime: "", priority: "" });
  const [results, setResults] = useState([]);
  const [metrics, setMetrics] = useState({ avgWT: 0, avgTAT: 0, avgRT: 0, cpuUtilization: 0, throughput: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [user, setUser] = useState("");

  // Load user from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser).email);
    }
  }, []);

  // Fetch latest process set from API
  useEffect(() => {
    fetchProcessSets();
  }, []);

  const fetchProcessSets = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/getProcessSets");
      const result = await response.json(); // Store full API response
  
      console.log("✅ Full API Response:", result);
  
      if (result.data && result.data.length > 0) { 
        // Assuming `data` contains an array of process sets
        const latestProcesses = result.data[result.data.length - 1].processes;
        console.log("✅ Loaded Processes:", latestProcesses);
        setProcesses([...latestProcesses]); // Ensure state updates with a new reference
      } else {
        console.warn("⚠️ No saved process sets found.");
        setProcesses([]); // Clear UI if no process sets are found
      }
    } catch (error) {
      console.error("❌ Error fetching process sets:", error);
    }
  };
  

  // Handle input field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProcess((prev) => ({ ...prev, [name]: value }));
  };

  // Add a new process
  const addProcess = () => {
    const { processId, arrivalTime, burstTime, priority } = newProcess;

    if (!processId || arrivalTime === "" || burstTime === "" || priority === "") {
      alert("All fields are required!");
      return;
    }

    if (arrivalTime < 0 || burstTime <= 0 || priority < 0) {
      alert("Invalid input! Ensure values are positive.");
      return;
    }

    const newProc = {
      processId,
      arrivalTime: Number(arrivalTime),
      burstTime: Number(burstTime),
      priority: Number(priority),
    };

    setProcesses([...processes, newProc]);
    setNewProcess({ processId: "", arrivalTime: "", burstTime: "", priority: "" });
  };

  // Remove a process
  const removeProcess = (id) => {
    setProcesses(processes.filter((proc) => proc.processId !== id));
  };

  // **🔹 Modify Process**
  const modifyProcess = (id) => {
    const updatedProcesses = processes.map((proc) =>
      proc.processId === id ? { ...proc, burstTime: proc.burstTime + 1 } : proc
    );
    setProcesses(updatedProcesses);
  };

  const handleRunAlgorithm = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/execute/${algorithm}`, processes);
      setResults(res.data.results);
      setMetrics({
        avgWT: res.data.avgWT,
        avgTAT: res.data.avgTAT,
        avgRT: res.data.avgRT,
        cpuUtilization: res.data.cpuUtilization,
        throughput: res.data.throughput
      });
      setIsRunning(true);
    } catch (err) {
      console.error("❌ Error executing algorithm:", err.response ? err.response.data : err.message);
      alert("❌ Error executing algorithm. Please check backend logs.");
    }
  };

  
  // **🔹 Save Process Set**
  const saveProcessSet = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/saveProcessSet", { user, processes});
      alert(response.data.message || "✅ Process set saved successfully!");
    } catch (error) {
      console.error("⚠️ Error saving process:", error);
      alert("🚨 An error occurred while saving.");
    }
  };

  
  
  // **🔹 Update Simulation Time Every Second**
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setCurrentTime((prevTime) => prevTime + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  // **🔹 Play, Pause, Reset Controls**
  const handlePlay = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setCurrentTime(0);
    setResults([]);
    setMetrics({ avgWT: 0, avgTAT: 0, avgRT: 0, cpuUtilization: 0, throughput: 0 });
  };

  const formatAlgorithmName = (algo) => {
    switch (algo) {
      case "fcfs": return "First Come First Serve (FCFS)";
      case "sjf": return "Shortest Job First (Non-preemptive)";
      case "srtf": return "Shortest Remaining Time First (Preemptive)";
      case "round_robin": return "Round Robin";
      case "priority": return "Priority Scheduling (Non-preemptive)";
      case "preemptive_priority": return "Preemptive Priority Scheduling";
      default: return algo;
    }
  };
  

  return (
    <div className="simulator-container">
      <h1>CPU Scheduling Simulator</h1>
      <h2>Current Simulation Time: {currentTime} ms</h2>

      {/* 🔹 Algorithm Selection Dropdown */}
      <div className="algorithm-selection">
        <label>Select Algorithm:</label>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="fcfs">First Come First Serve (FCFS)</option>
          <option value="sjf">Shortest Job First (SJF - Non-preemptive)</option>
          <option value="srtf">Shortest Remaining Time First (SJF - Preemptive)</option>
          <option value="round_robin">Round Robin (RR)</option>
          <option value="priority">Priority Scheduling (Non-preemptive)</option>
          <option value="preemptive_priority">Preemptive Priority Scheduling</option>
        </select>
      </div>

      {/* Process Input Fields */}
      <div className="process-input">
        <input type="text" name="processId" placeholder="Process ID" value={newProcess.processId} onChange={handleChange} />
        <input type="number" name="arrivalTime" placeholder="Arrival Time" value={newProcess.arrivalTime} onChange={handleChange} />
        <input type="number" name="burstTime" placeholder="Burst Time" value={newProcess.burstTime} onChange={handleChange} />
        <input type="number" name="priority" placeholder="Priority" value={newProcess.priority} onChange={handleChange} />
        <button onClick={addProcess}>Add Process</button>
      </div>

      {/* Process List */}
      <div className="process-list">
        {processes.map((proc, index) => (
          <div key={index} className="process-item">
            <p>P{proc.processId} - Arrival: {proc.arrivalTime}, Burst: {proc.burstTime}, Priority: {proc.priority}</p>
            <button onClick={() => removeProcess(proc.processId)}>Remove</button>
            <button onClick={() => modifyProcess(proc.processId)}>Modify</button>
          </div>
        ))}
      </div>


      <div className="button-container">
        <button onClick={handlePlay}>▶ Play</button>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleReset}>⏹ Reset</button>
        <button onClick={handleRunAlgorithm} className="run-btn">Run Algorithm</button>
        <button onClick={saveProcessSet} className="save-btn">Save Process Set</button>
        <button onClick={fetchProcessSets} className="load-btn">Load Process Set</button>
      </div>

      {algorithm && (
  <div className="current-algo">
    <strong>Currently Running Algorithm:</strong> <span>{formatAlgorithmName(algorithm)}</span>
  </div>
)}


      <div className="results">
         <h2>Gantt Chart</h2>
         {results.length > 0 ? (
         <div className="gantt-chart">
         <div className="gantt-track">
           {results.map((proc, index) => (
             <div
               key={index}
               className="gantt-block"
               style={{
                 width: `${(proc.completionTime - proc.startTime) * 35}px`,
                 backgroundColor: colorPalette[index % colorPalette.length],
                 left: `${proc.startTime * 35}px`,
                 animationDelay: `${index * 0.2}s`
               }}
             >
               <span className="process-label">P{proc.processId}</span>
             </div>
           ))}
         </div>
       
         {/* Timeline Row */}
         <div className="timeline">
           {results.map((proc, index) => (
             <React.Fragment key={index}>
               <span
                 className="timeline-label"
                 style={{
                   left: `${proc.startTime * 35}px`
                 }}
               >
                 {proc.startTime}
               </span>
               {/* For last process, add its end time */}
               {index === results.length - 1 && (
                 <span
                   className="timeline-label"
                   style={{
                     left: `${proc.completionTime * 35}px`
                   }}
                 >
                   {proc.completionTime}
                 </span>
               )}
             </React.Fragment>
           ))}
         </div>
       </div>       
       
  ) : (
    <p>No results to display.</p>
  )}
</div>


      {/* 🔹 Performance Metrics Section */}
      <div className="metrics">
        <h2>Performance Metrics</h2>
        <p><strong>Avg WT:</strong> {metrics.avgWT} ms</p>
        <p><strong>Avg TAT:</strong> {metrics.avgTAT} ms</p>
        <p><strong>Avg RT:</strong> {metrics.avgRT} ms</p>
        <p><strong>CPU Utilization:</strong> {metrics.cpuUtilization}%</p>
        <p><strong>Throughput:</strong> {metrics.throughput} processes/unit time</p>
      </div>
    </div>
  );
};

export default Scheduler;
