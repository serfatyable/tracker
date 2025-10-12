import { redirect } from 'next/navigation';

export default function RootRedirect() {
  // Server-side redirect avoids blank/404 on initial load in Vercel preview
  redirect('/auth');
}
