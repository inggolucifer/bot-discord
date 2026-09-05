import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eksplorasi | Jianghu RP',
  description: 'Mulai eksplorasi untuk mencari resource dan material langka.',
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
