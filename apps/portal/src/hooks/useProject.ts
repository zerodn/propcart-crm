'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Project, ProjectResponse, ProjectsResponse } from '@/types';

const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID || '';

export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !WORKSPACE_ID) {
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get<ProjectResponse>(
          `/portal/${WORKSPACE_ID}/projects/${projectId}`,
        );
        setProject(data.data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch project';
        setError(message);
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}

export function useProjects(params?: {
  search?: string;
  page?: number;
  limit?: number;
  projectType?: string;
  province?: string;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!WORKSPACE_ID) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.projectType) query.append('projectType', params.projectType);
        if (params?.province) query.append('province', params.province);

        const { data } = await apiClient.get<ProjectsResponse>(
          `/portal/${WORKSPACE_ID}/projects?${query.toString()}`,
        );
        setProjects(data.data || []);
        setTotal(data.meta?.total || 0);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch projects';
        setError(message);
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [params?.search, params?.page, params?.limit, params?.projectType, params?.province]);

  return { projects, loading, error, total };
}

export interface CatalogOption {
  value: string;
  label: string;
}

export function useCatalogOptions(endpoint: string) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!WORKSPACE_ID || !endpoint) {
      setLoading(false);
      return;
    }
    apiClient
      .get<{ data: CatalogOption[] }>(`/portal/${WORKSPACE_ID}/${endpoint}`)
      .then(({ data }) => setOptions(data.data || []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { options, loading };
}


