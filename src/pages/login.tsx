import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="auth-container">
      <h1>Login</h1>
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
          <button type="submit" disabled={submitting || loading}>
            {activeAction === 'signin' ? 'Signing in...' : 'Sign In'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleCreateAccount}
            disabled={submitting || loading}
          >
            {activeAction === 'signup' ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>

      <p>
        Don&apos;t have an account? <Link to="/">Go back</Link>
      </p>
    </div>
  );
}
