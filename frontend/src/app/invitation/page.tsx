import InvitationClient from './InvitationClient';

interface InvitationPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function InvitationPage({ searchParams }: InvitationPageProps) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';

  return <InvitationClient token={token} />;
}
