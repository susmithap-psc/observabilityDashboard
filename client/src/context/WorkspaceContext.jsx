import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const { data } = await api.get('/workspaces');
        setWorkspaces(data.data);
        
        // Auto-select first workspace or from localStorage
        const savedWsId = localStorage.getItem('currentWorkspaceId');
        const saved = data.data.find(w => w._id === savedWsId);
        setCurrentWorkspace(saved || data.data[0] || null);
      } catch {
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user]);

  const selectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace._id);
  };

  const refreshWorkspaces = async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data.data);
    } catch {
      // keep existing
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, selectWorkspace, loading, refreshWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
