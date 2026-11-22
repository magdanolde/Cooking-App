import { loginAction } from './actions';

export const metadata = { title: 'Log in · Recipes' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="screen login">
      <div className="login-card">
        <h1 className="h1">Recipes</h1>
        <p className="muted">Enter your password to open your recipe box.</p>
        <form action={loginAction} className="stack">
          <input type="hidden" name="next" value={next ?? '/'} />
          <label className="field">
            <span className="label">Password</span>
            <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {error === 'wrong' && (
            <p className="error" role="alert">
              That password is not right.
            </p>
          )}
          {error === 'config' && (
            <p className="error" role="alert">
              APP_PASSWORD is not set on the server.
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit">
            Open
          </button>
        </form>
      </div>
    </main>
  );
}
