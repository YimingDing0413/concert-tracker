import { YearEndWrapUp } from '@/components/wrap-up/year-end/YearEndWrapUp';
import { useAuth } from '@/context/AuthContext';

export function YearEndWrapUpPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="pb-4">
      <YearEndWrapUp userId={user.id} />
    </div>
  );
}
