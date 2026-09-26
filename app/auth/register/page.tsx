import { getDictionaryForRequest } from '@/lib/i18n/server';
import { RegisterPage } from '@/components/auth/register-page';

export default async function AuthRegisterPage() {
  const { dictionary } = await getDictionaryForRequest();
  return <RegisterPage dictionary={dictionary} />;
}
