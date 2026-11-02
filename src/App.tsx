import { AuthProvider } from '@/context/AuthContext';
import { RequireAuthProvider } from '@/hooks/useRequireAuth';
import { AppRoutes } from '@/routes/AppRoutes';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequireAuthProvider>
          <AppRoutes />
        </RequireAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
