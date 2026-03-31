import { useState, useEffect, useCallback } from "react";
import type {
  CuratorData,
  CuratorStats,
  ApprovedChannel,
  FilteredChannel,
} from "../types";

export function useCuratorData() {
  const [data, setData] = useState<CuratorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CuratorStats | null>(null);
  const [approvedChannels, setApprovedChannels] = useState<ApprovedChannel[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [rejectedChannels, setRejectedChannels] = useState<
    { name: string; id: string; reviewedAt?: string | null; importedAt?: string | null; notes?: string | null }[]
  >([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [filteredChannels, setFilteredChannels] = useState<FilteredChannel[]>([]);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [pendingChannels, setPendingChannels] = useState<
    { name: string; id: string; topics?: string[]; importedAt?: string | null }[]
  >([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Subscription check state
  const [newSubCount, setNewSubCount] = useState(0);
  const [subCheckError, setSubCheckError] = useState<string | undefined>();

  const fetchNext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/curator");
      const json = await res.json();
      setData(json);
      return json;
    } catch (e) {
      console.error("fetchNext failed:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/curator?mode=stats");
      const json = await res.json();
      setStats(json);
    } catch (e) {
      console.error("fetchStats failed:", e);
    }
  }, []);

  const fetchApproved = useCallback(async () => {
    setApprovedLoading(true);
    try {
      const res = await fetch("/api/curator?mode=approved");
      const json = await res.json();
      setApprovedChannels(json.channels || []);
    } catch (e) {
      console.error("fetchApproved failed:", e);
    } finally {
      setApprovedLoading(false);
    }
  }, []);

  const fetchRejected = useCallback(async () => {
    setRejectedLoading(true);
    try {
      const res = await fetch("/api/curator?mode=rejected");
      const json = await res.json();
      setRejectedChannels(json.channels || []);
    } catch (e) {
      console.error("fetchRejected failed:", e);
    } finally {
      setRejectedLoading(false);
    }
  }, []);

  const fetchFiltered = useCallback(async () => {
    setFilteredLoading(true);
    try {
      const res = await fetch("/api/curator?mode=filtered");
      const json = await res.json();
      setFilteredChannels(json.channels || []);
    } catch (e) {
      console.error("fetchFiltered failed:", e);
    } finally {
      setFilteredLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/curator?mode=pending");
      const json = await res.json();
      setPendingChannels(json.channels || []);
    } catch (e) {
      console.error("fetchPending failed:", e);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const checkSubs = useCallback(async () => {
    setSubCheckError(undefined);
    try {
      const res = await fetch("/api/curator?mode=check-subs");
      const json = await res.json();
      setNewSubCount(json.newCount || 0);
      if (json.error) setSubCheckError(json.error);
    } catch (e) {
      setSubCheckError(e instanceof Error ? e.message : "Check failed");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPending();
    fetchFiltered();
  }, [fetchStats, fetchPending, fetchFiltered]);

  return {
    data,
    setData,
    loading,
    stats,
    approvedChannels,
    setApprovedChannels,
    approvedLoading,
    rejectedChannels,
    rejectedLoading,
    filteredChannels,
    filteredLoading,
    pendingChannels,
    pendingLoading,
    newSubCount,
    setNewSubCount,
    subCheckError,
    fetchNext,
    fetchStats,
    fetchApproved,
    fetchRejected,
    fetchFiltered,
    fetchPending,
    checkSubs,
  };
}
