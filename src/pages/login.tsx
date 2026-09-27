import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WorkoutButton } from '../components/WorkoutButton';

type LocationState = {
  from?: {
    pathname: string;
    search?: string;
  };
};

export default function Login() {
  const { signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const redirectPath = state?.from?.pathname ? `${state.from.pathname}${state.from.search ?? ''}` : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
	const [activeAction, setActiveAction] = useState<'signin' | 'signup' | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setError('');
		setActiveAction('signin');

    try {
      await signIn(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
			setActiveAction(null);
    }
  };

  const handleCreateAccount = async () => {
    setSubmitting(true);
    setActiveAction('signup');
    setError('');

    try {
      const hasSession = await signUp(email.trim(), password);
      if (hasSession) {
        navigate(redirectPath, { replace: true });
      } else {
        setError('Please check your email to confirm your account before signing in.');
      }
    } catch (err) {
      const message = (err as Error).message ?? 'Unable to create your account. Please try again.';
      setError(message);
			console.log(err);
    } finally {
      setSubmitting(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="auth-container color-context color-context--inverse">
      <div className="auth-logo" role="img" aria-label="IWYN Fitness" />
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting || loading}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting || loading}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}
				<div className="auth-actions">
          <WorkoutButton
            label="Sign In"
            type="submit"
            loading={activeAction === 'signin'}
            loadingLabel="Signing in..."
            disabled={(submitting && activeAction !== 'signin') || loading}
          />
          <WorkoutButton
            label="Create Account"
            variant="secondary"
            onClick={handleCreateAccount}
            loading={activeAction === 'signup'}
            loadingLabel="Creating..."
            disabled={(submitting && activeAction !== 'signup') || loading}
          />
        </div>
      </form>

      <p>
        Don&apos;t have an account? <Link to="/">Go back</Link>
      </p>
    </div>
  );
}
