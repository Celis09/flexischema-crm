# Flexi Schema CRM

A modern, highly-performant Contact Management and CRM application built with React, TypeScript, and Vite. This application demonstrates scalable frontend architecture, robust state management, and optimized rendering techniques suitable for enterprise environments.


## ✨ Key Features

- **High-Performance Table Virtualization:** Utilizes `@tanstack/react-virtual` to render thousands of contact rows seamlessly without freezing the DOM.
- **Dynamic & Resizable Columns:** Users can drag-and-drop to reorder columns using `@hello-pangea/dnd` and dynamically resize column widths.
- **Role-Based Access Control (RBAC):** Secure routing and UI elements conditionally rendered based on user roles (`Admin`, `Editor`, `Viewer`).
- **Dynamic Schema System:** Administrators can define custom "Extra Fields" for contacts, which instantly propagate to the UI, data tables, and forms.
- **Feature-Based Architecture:** Code is modularized into business domains (Auth, Contacts, Admin) for maximum scalability.
- **Comprehensive Testing:** Automated unit and integration testing suite powered by Vitest and React Testing Library.

## 🛠 Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Custom CSS (Design Tokens / Flexi Schema UI)
- **Virtualization:** `@tanstack/react-virtual`
- **Drag & Drop:** `@hello-pangea/dnd`
- **Testing:** Vitest, React Testing Library, JSDOM


## 📂 Project Architecture

The application is built using a decoupled architecture, meaning this repository contains only the React frontend. 

## 🌐 Live Environments

| Layer    | URL                                                              |
|----------|------------------------------------------------------------------|
| Backend  | [http://flexischemacrm.runasp.net](http://flexischemacrm.runasp.net) |
| Frontend | [https://flexischema-crm-tawny.vercel.app](https://flexischema-crm-tawny.vercel.app) |
| Swagger  | [http://flexischemacrm.runasp.net/swagger](http://flexischemacrm.runasp.net/swagger) |
| Health   | [http://flexischemacrm.runasp.net/health](http://flexischemacrm.runasp.net/health) |

This project utilizes a **Feature-Based Architecture** on the frontend to ensure clean separation of concerns:

```text
src/
├── features/        # Self-contained business domains
│   ├── admin/       # System metrics, audit logs, schema configs
│   ├── auth/        # Authentication & JWT handling
│   └── contacts/    # Core CRM table, virtualization, and state orchestration
├── components/      # Globally shared "dumb" UI elements
├── hooks/           # Shared state logic (e.g., Theme, CurrentUser)
├── lib/             # Utilities (e.g., centralized HttpClient)
├── styles/          # Single source of truth for CSS design tokens
└── types/           # Global TypeScript data models
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Celis09/flexischema-crm.git
   cd contacts-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```


## 🧪 Testing

Run the automated test suite to verify data logic and component rendering:

```bash
npm run test:run
```

To run TypeScript compiler checks:
```bash
npm run typecheck
```
