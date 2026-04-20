# TPT Infrastructure Engineer Platform

Complete end-to-end platform for infrastructure engineering planning, design, costing and reporting. Built for civil engineers, project managers, quantity surveyors and contractors.

## ✅ Features

| Module | Status |
|---|---|
| ✅ Project Workspace | Planned |
| ✅ 2D/3D Drawing Board | Planned |
| ✅ AI Design Generator | Planned |
| ✅ Materials Database | Planned |
| ✅ Trade Breakdown Classification | Planned |
| ✅ Feasibility Analysis Engine | Planned |
| ✅ Cost Estimator | Planned |
| ✅ CPM Timeline Scheduler | Planned |
| ✅ Risk Analysis | Planned |
| ✅ Regulatory Report Generator | Planned |
| ✅ Purchase Order & Procurement | Planned |
| ✅ Role Based Access Control | Planned |

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Drawing Engine | Fabric.js + Three.js |
| Backend | FastAPI + Python 3.12 |
| Database | PostgreSQL + PostGIS |
| AI Engine | Llama 3 70B + LangChain |
| Calculations | NumPy + SciPy |

## 🚀 Development Setup

```bash
# Install dependencies
npm install

# Start backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# Start frontend
cd frontend && npm run dev
```

## Architecture

```
tpt-infrastructure-engineer/
├── frontend/          React Web Application
├── backend/           FastAPI Backend Services
├── database/          Database Migrations & Schemas
├── schemas/           Engineering Calculation Schemas
├── docs/              Documentation
└── tests/             Test Suite
```

## License

MIT License

Copyright (c) 2026 TPT Infrastructure Engineer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
