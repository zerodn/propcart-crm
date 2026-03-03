'use client';

import { useState } from 'react';
import { ChevronsUpDown, Building2, User } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useWorkspaces } from '@/hooks/use-workspaces';

export function WorkspaceSwitcher() {
  const { workspace, role, switchWorkspace } = useAuth();
  const { workspaces } = useWorkspaces();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
          {workspace?.type === 'COMPANY' ? (
            <Building2 className="h-4 w-4 text-white" />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {workspace?.name || 'Workspace'}
          </p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-1">
            <p className="text-xs font-medium text-gray-500 px-2 py-1.5">Chọn workspace</p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors ${ws.id === workspace?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-md flex-shrink-0">
                  {ws.type === 'COMPANY' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate">{ws.name}</p>
                  <p className="text-xs text-gray-400">{ws.role}</p>
                </div>
                {ws.id === workspace?.id && <span className="text-xs text-blue-600 flex-shrink-0">Hiện tại</span>}
              </button>
            ))}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
