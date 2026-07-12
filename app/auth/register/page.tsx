import { redirect } from 'next/navigation';

export default function RegisterPage() {
  // Registration and login are unified in the new auth flow
  redirect('/auth/login');
}
