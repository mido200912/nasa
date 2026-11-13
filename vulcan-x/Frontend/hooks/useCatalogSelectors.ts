"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogApiError, getCatalogEnvironments, getCatalogMaterials, type CatalogEnvironment, type CatalogMaterial } from "@/lib/catalog";

type ResourceState<T> = { items: T[]; loading: boolean; error: string | null };

export function useCatalogEnvironments() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<ResourceState<CatalogEnvironment>>({ items: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    void getCatalogEnvironments(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setState({ items, loading: false, error: null }); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current, loading: false, error: catalogMessage(cause) }));
      });
    return () => controller.abort();
  }, [refreshKey]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setRefreshKey((value) => value + 1);
  }, []);
  return { ...state, retry };
}

type MaterialState = ResourceState<CatalogMaterial> & { totalCount: number; loadedPage: number; query: string };

export function useCatalogMaterials(search: string) {
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<MaterialState>({ items: [], loading: true, error: null, totalCount: 0, loadedPage: 0, query: "" });
  const latestRequest = useRef(0);
  const normalizedSearch = search.trim();

  const queryChanged = state.query !== normalizedSearch;
  const requestedPage = queryChanged ? 1 : page;

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++latestRequest.current;
    void getCatalogMaterials({ search: normalizedSearch, page: requestedPage, pageSize: 50 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || requestId !== latestRequest.current) return;
        setState((current) => ({
          items: result.page === 1 ? result.items : mergeMaterials(current.items, result.items),
          loading: false,
          error: null,
          totalCount: result.totalCount,
          loadedPage: result.page,
          query: normalizedSearch,
        }));
        if (queryChanged && result.page === 1) setPage(1);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestId !== latestRequest.current) return;
        setState((current) => ({ ...current, loading: false, error: catalogMessage(cause), query: normalizedSearch }));
      });
    return () => controller.abort();
  }, [normalizedSearch, queryChanged, requestedPage, refreshKey]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setPage(1);
    setRefreshKey((value) => value + 1);
  }, []);
  const loadMore = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setPage(state.loadedPage + 1);
  }, [state.loadedPage]);
  const loading = state.loading || queryChanged;
  const totalCount = queryChanged ? 0 : state.totalCount;
  const items = queryChanged ? [] : state.items;
  return { items, loading, error: queryChanged ? null : state.error, totalCount, loadedPage: state.loadedPage, hasMore: !queryChanged && items.length < totalCount, retry, loadMore };
}

function mergeMaterials(current: CatalogMaterial[], next: CatalogMaterial[]): CatalogMaterial[] {
  const byId = new Map(current.map((material) => [material.id, material]));
  for (const material of next) byId.set(material.id, material);
  return [...byId.values()];
}

function catalogMessage(cause: unknown): string {
  if (cause instanceof CatalogApiError) return cause.message;
  return "Catalog service is unavailable. Please retry.";
}
