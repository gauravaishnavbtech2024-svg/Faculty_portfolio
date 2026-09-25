export default function NotAuthorized() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-slate-900">
      <h1 className="text-2xl font-semibold">This Google account is not approved</h1>
      <p className="mt-3 text-slate-600">Sign in with the official or personal email the administrator has on file for you. If you think this is a mistake, ask the administrator to add your email.</p>
      <form action="/auth/signout" method="post" className="mt-6">
        <button className="rounded bg-teal-800 px-4 py-2 text-white">Sign out and try another account</button>
      </form>
    </main>
  );
}
