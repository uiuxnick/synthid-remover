import { WorkspaceClient } from '@/app/components/WorkspaceClient';

export const metadata = { title: 'Workspace', robots: { index: false } };

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
