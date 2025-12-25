import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Tracker - TV Display',
  description: 'Real-time team activity display for TV screens',
};

export default function TVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
