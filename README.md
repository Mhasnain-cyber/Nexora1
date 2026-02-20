
# RIFT Hackathon: Financial Crime Detection System

## 🚀 Project Title: Graph-Based Money Muling Detection Engine

### 🔗 Live Demo URL
[https://nexorarift.netlify.app/]

### 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI
- **Visualization:** Recharts (Interactive Graphs)
- **Algorithm Logic:** Custom Graph Traversal (DFS/BFS)

---

## 🏗 System Architecture
The application is built as a client-side heavy Next.js app to ensure fast processing without server overhead for the demo.
1.  **CSV Upload:** Users upload transaction data.
2.  **Parsing Engine:** Auto-detects columns (Sender, Receiver, Amount, Timestamp).
3.  **Graph Construction:** Builds an adjacency list and calculates node degrees.
4.  **Detection Engine:** Runs three parallel algorithms:
    *   Cycle Detection (DFS)
    *   Smurfing Detection (Time-Window Analysis)
    *   Shell Network Analysis (Chain Traversal)
5.  **Scoring System:** Aggregates risk scores and filters legitimate high-volume accounts.
6.  **Visualization:** Renders interactive graphs and tables.

---

## 🧠 Algorithm Approach & Complexity

### 1. Cycle Detection (Circular Fund Routing)
-   **Method:** Depth-First Search (DFS) with path tracking.
-   **Logic:** Looks for paths `A -> B -> ... -> A` of length 3 to 5.
-   **Complexity:** O(V + E) per start node, optimized by limiting depth to 5.

### 2. Smurfing Detection (Fan-In / Fan-Out)
-   **Method:** Temporal Grouping.
-   **Logic:**
    *   **Fan-In:** >10 senders to 1 receiver within 72 hours.
    *   **Fan-Out:** 1 sender to >10 receivers within 72 hours.
-   **Complexity:** O(T log T) where T is transactions (due to sorting by timestamp).

### 3. Shell Networks (Layered Muling)
-   **Method:** Chain Traversal.
-   **Logic:** Identifies chains `Source -> Shell1 -> Shell2 -> Dest` where intermediate nodes have `Total Degree <= 3`.
-   **Complexity:** O(V * AvgDegree^Depth).

### 4. High Velocity
-   **Method:** Sliding Window.
-   **Logic:** >10 transactions in 1 hour.

---

## 🎯 Suspicion Score Methodology
Scores are normalized to 0-100. Accounts are flagged based on weighted patterns:

| Pattern Type | Weight | Description |
| :--- | :--- | :--- |
| **Cycle Participant** | +50 | Strongest indicator of money laundering. |
| **Smurfing (Fan-In/Out)** | +40 | High volume, structured placement. |
| **Shell Account** | +30 | Low activity intermediary. |
| **High Velocity** | +25 | Rapid movement of funds. |

**False Positive Protection (Legitimate Merchants):**
*   If `Degree > 20` AND `No Cycle/Shell Patterns`: **Score reduced by 75 points**.
*   This ensures high-volume merchants/exchanges are not flagged.

---

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mhasnain-cyber/Nexora1.git
    cd Nexora1
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the app:**
    Navigate to [http://localhost:3000](http://localhost:3000)

---



## 👥 Team Members
-   [Kartik Gupta]
-   [Mohd Hasnain]
-   [Yash Dubey]
-   [Mudit Garg]

---

**Built for RIFT 2026 Hackathon.** *Follow the money.*
