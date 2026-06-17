import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout      from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth }    from './auth/AuthContext.jsx';
import Login          from './pages/Login.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Customers      from './pages/Customers/index.jsx';
import Products       from './pages/Products/index.jsx';
import Bills          from './pages/Bills/index.jsx';
import BillForm       from './pages/Bills/BillForm.jsx';
import BillDetail     from './pages/Bills/BillDetail.jsx';
import PrintInvoice   from './pages/Bills/PrintInvoice.jsx';
import Ledger         from './pages/Ledger/index.jsx';
import Reports        from './pages/Reports/index.jsx';
import Settings       from './pages/Settings/index.jsx';
import Inventory      from './pages/Inventory/index.jsx';
import CustomerLedger from './pages/Customers/CustomerLedger.jsx';
import Expenses       from './pages/Expenses/index.jsx';
import Employees      from './pages/Employees/index.jsx';
import Attendance     from './pages/Attendance/index.jsx';
import Payroll        from './pages/Payroll/index.jsx';
import QuickQuote     from './pages/Calculator/index.jsx';
import RateList       from './pages/RateList/index.jsx';
import RateListPrint  from './pages/RateList/PrintView.jsx';
import DailyClosing   from './pages/DailyClosing/index.jsx';
import UserManagement from './pages/Users/index.jsx';
import NotFound       from './pages/NotFound.jsx';
import DemoExpired    from './pages/DemoExpired.jsx';

const HomeRoute = () => {
  const { isOwner } = useAuth();
  return isOwner ? <Dashboard /> : <Navigate to="/bills" replace />;
};

const OwnerOnly = ({ element }) => {
  const { isOwner } = useAuth();
  return isOwner ? element : <Navigate to="/bills" replace />;
};

const router = createBrowserRouter([
  { path: 'login', element: <Login /> },

  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true,                      element: <HomeRoute /> },

          // Both roles
          { path: 'bills',                    element: <Bills /> },
          { path: 'bills/new',                element: <BillForm /> },
          { path: 'bills/:id/edit',           element: <BillForm /> },
          { path: 'bills/:id',                element: <BillDetail /> },
          { path: 'attendance',               element: <Attendance /> },

          // Owner-only
          { path: 'customers',                element: <OwnerOnly element={<Customers />} /> },
          { path: 'customers/:id/ledger',     element: <OwnerOnly element={<CustomerLedger />} /> },
          { path: 'products',                 element: <OwnerOnly element={<Products />} /> },
          { path: 'ledger',                   element: <OwnerOnly element={<Ledger />} /> },
          { path: 'reports',                  element: <OwnerOnly element={<Reports />} /> },
          { path: 'settings',                 element: <OwnerOnly element={<Settings />} /> },
          { path: 'inventory',                element: <OwnerOnly element={<Inventory />} /> },
          { path: 'expenses',                 element: <OwnerOnly element={<Expenses />} /> },
          { path: 'employees',                element: <OwnerOnly element={<Employees />} /> },
          { path: 'payroll',                  element: <OwnerOnly element={<Payroll />} /> },
          { path: 'calculator',               element: <OwnerOnly element={<QuickQuote />} /> },
          { path: 'rate-list',                element: <OwnerOnly element={<RateList />} /> },
          { path: 'daily-closing',            element: <OwnerOnly element={<DailyClosing />} /> },
          { path: 'users',                    element: <OwnerOnly element={<UserManagement />} /> },
        ],
      },
    ],
  },

  { path: 'bills/:id/print', element: <PrintInvoice /> },
  { path: 'rate-list/print', element: <RateListPrint /> },
  { path: 'demo-expired',    element: <DemoExpired /> },
  { path: '*',               element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
