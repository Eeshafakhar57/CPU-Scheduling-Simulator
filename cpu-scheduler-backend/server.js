
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const ProcessSetModel = require("./models/processSet");  // Import the model


const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// 🔹 **Connect to MongoDB**
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("MongoDB Connection Failed:", err.message);
    process.exit(1); // Exit process with failure
  });

  app.get("/api/processSets", async (req, res) => {
    try {
        const processSets = await ProcessSetModel.find();
        res.json(processSets);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch process sets" });
    }
});


  app.get("/test-db", async (req, res) => {
    try {
      const users = await User.find(); // Get all users
      const processSets = await ProcessSetModel.find(); // Get all process sets
      res.json({ users, processSets });
    } catch (error) {
      res.status(500).json({ error: "Database query failed" });
    }
  });
  

// 🔹 **User Registration**
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.json({ message: "✅ User registered successfully!" });
  } catch (err) {
    res.status(500).json({ message: "❌ Error registering user" });
  }
});

// 🔹 **User Login**
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "❌ User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "❌ Invalid credentials" });

    const token = jwt.sign({ email: user.email }, "secretkey", { expiresIn: "1h" });
    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "❌ Error logging in" });
  }
});

// ✅ Save Process Set API
app.post("/api/saveProcessSet", async (req, res) => {
  try {
      console.log("Received Data:", req.body);

      if (!req.body.processes || req.body.processes.length === 0) {
          return res.status(400).json({ message: "No processes provided" });
      }

      const newSet = new ProcessSetModel({ processes: req.body.processes });
      await newSet.save();

      console.log("✅ Process set saved:", newSet);
      res.status(201).json({ message: "Process set saved successfully", data: newSet });

  } catch (error) {
      console.error("❌ Error saving process set:", error);
      res.status(500).json({ message: "Failed to save process set", error: error.message });
  }
});

// ✅ **Load All Process Sets**
// ✅ Fetch All Process Sets API
app.get("/api/getProcessSets", async (req, res) => {
    try {
        const processSets = await ProcessSetModel.find();
        console.log("✅ Retrieved Process Sets:", processSets);
        res.status(200).json({ message: "Process sets retrieved successfully", data: processSets });

    } catch (error) {
        console.error("❌ Error fetching process sets:", error);
        res.status(500).json({ message: "Failed to retrieve process sets", error: error.message });
    }
});



// 🔹 **Performance Metrics Calculation**
function calculateMetrics(processes) {
  let totalWT = 0, totalTAT = 0, totalRT = 0, totalExecutionTime = 0;
  const n = processes.length;

  processes.forEach(proc => {
    proc.turnaroundTime = proc.completionTime - proc.arrivalTime;
    proc.waitingTime = proc.turnaroundTime - proc.burstTime;
    proc.responseTime = proc.startTime - proc.arrivalTime;
    
    totalWT += proc.waitingTime;
    totalTAT += proc.turnaroundTime;
    totalRT += proc.responseTime;
  });

  totalExecutionTime = processes[processes.length - 1].completionTime;

  return { 
    results: processes, 
    avgWT: (totalWT / n).toFixed(2), 
    avgTAT: (totalTAT / n).toFixed(2), 
    avgRT: (totalRT / n).toFixed(2),
    cpuUtilization: ((totalTAT / totalExecutionTime) * 100).toFixed(2) + "%",
    throughput: (n / totalExecutionTime).toFixed(2)
  };
}

app.post("/execute/preemptive_priority", (req, res) => {
  let processes = req.body.map(proc => ({ ...proc, remainingBurstTime: proc.burstTime }));
  let currentTime = 0;
  let completed = 0;
  let results = [];

  while (completed < processes.length) {
    let availableProcesses = processes.filter(p => p.arrivalTime <= currentTime && p.remainingBurstTime > 0);

    if (availableProcesses.length === 0) {
      currentTime++;
      continue;
    }

    availableProcesses.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
    let currentProcess = availableProcesses[0];

    if (!currentProcess.startTime) {
      currentProcess.startTime = currentTime;
    }

    currentProcess.remainingBurstTime -= 1;
    currentTime++;

    if (currentProcess.remainingBurstTime === 0) {
      completed++;
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
      currentProcess.responseTime = currentProcess.startTime - currentProcess.arrivalTime;
      results.push(currentProcess);
    }
  }

  res.json(calculateMetrics(results));
});

app.post("/execute/srtf", (req, res) => {
  let processes = req.body.map(proc => ({
    ...proc,
    remainingBurstTime: proc.burstTime,
    completionTime: 0,
    startTime: -1,
  }));

  let currentTime = 0;
  let completed = 0;
  let ganttChart = [];
  let lastProcessId = null;

  while (completed < processes.length) {
    let availableProcesses = processes.filter(p => p.arrivalTime <= currentTime && p.remainingBurstTime > 0);

    if (availableProcesses.length === 0) {
      currentTime++;
      continue;
    }

    availableProcesses.sort((a, b) => a.remainingBurstTime - b.remainingBurstTime);
    let currentProcess = availableProcesses[0];

    if (lastProcessId !== currentProcess.processId) {
      ganttChart.push({ processId: currentProcess.processId, startTime: currentTime });
      lastProcessId = currentProcess.processId;
    }

    currentProcess.remainingBurstTime -= 1;
    currentTime++;

    if (currentProcess.remainingBurstTime === 0) {
      completed++;
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
      currentProcess.responseTime = currentProcess.startTime !== -1 ? currentProcess.startTime - currentProcess.arrivalTime : 0;
    }

    if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].processId === currentProcess.processId) {
      ganttChart[ganttChart.length - 1].endTime = currentTime;
    }
  }

  console.log("Generated Gantt Chart:", ganttChart);
  res.json({ ...calculateMetrics(processes), ganttChart });
});



// 🔹 **Scheduling Algorithms**
const schedulingAlgorithms = {
  fcfs: (req, res) => {
    let processes = req.body.sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    let ganttChart = [];

    processes.forEach(proc => {
      proc.startTime = Math.max(currentTime, proc.arrivalTime);
      proc.completionTime = proc.startTime + proc.burstTime;
      ganttChart.push({ processId: proc.processId, startTime: proc.startTime, endTime: proc.completionTime });
      currentTime = proc.completionTime;
    });
    console.log("Generated Gantt Chart (FCFS):", ganttChart);
    res.json(calculateMetrics(processes));
  },

  sjf: (req, res) => {
    let processes = req.body.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    let ganttChart = [];

    processes.forEach(proc => {
      proc.startTime = Math.max(currentTime, proc.arrivalTime);
      proc.completionTime = proc.startTime + proc.burstTime;
      ganttChart.push({ processId: proc.processId, startTime: proc.startTime, endTime: proc.completionTime });
      currentTime = proc.completionTime;
    });
    console.log("Generated Gantt Chart (FCFS):", ganttChart);
    res.json(calculateMetrics(processes));
  },

  priority: (req, res) => {
    let processes = req.body.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    let ganttChart = [];

    processes.forEach(proc => {
      proc.startTime = Math.max(currentTime, proc.arrivalTime);
      proc.completionTime = proc.startTime + proc.burstTime;
      ganttChart.push({ processId: proc.processId, startTime: proc.startTime, endTime: proc.completionTime });
      currentTime = proc.completionTime;
    });
    console.log("Generated Gantt Chart (FCFS):", ganttChart);
    res.json(calculateMetrics(processes));
  },

  round_robin: (req, res) => {
    const quantum = 2;
    let queue = [...req.body];
    let currentTime = 0;
    const results = [];
    const ganttChart = [];
    let lastProcessId = null;

    while (queue.length > 0) {
      let proc = queue.shift();
      let executionTime = Math.min(proc.burstTime, quantum);
      let startTime = currentTime;
      let completionTime = startTime + executionTime;
      currentTime = completionTime;
      proc.burstTime -= executionTime;

      // Gantt Chart: Track Process Execution
      if (lastProcessId !== proc.processId) {
        ganttChart.push({ processId: proc.processId, startTime });
        lastProcessId = proc.processId;
    }


      results.push({ ...proc, startTime, completionTime });

      if (proc.burstTime > 0) queue.push(proc);
      
    }
    // End previous process execution segment
    if (ganttChart.length > 0 && ganttChart[ganttChart.length - 1].processId === proc.processId) {
      ganttChart[ganttChart.length - 1].endTime = currentTime;
    res.json(calculateMetrics(results), ganttChart);
    }
  }
};

// 🔹 **Attach Routes for Each Algorithm**
Object.keys(schedulingAlgorithms).forEach(algo => {
  app.post(`/execute/${algo}`, schedulingAlgorithms[algo]);
});

// 🔹 **Start Server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
