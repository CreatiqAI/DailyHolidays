import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const { error } = await props.searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <p className="font-script text-4xl text-navy-800">Daily</p>
        <h1 className="mt-1 text-lg font-semibold text-navy-900">Admin sign in</h1>
        <p className="mb-6 text-sm text-navy-500">Manage tours, dates and enquiries.</p>
        {error === "not-admin" && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">This account does not have admin access.</p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
