import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClientFrontend';

/**
 * Subscribes to Supabase Realtime changes on one or more tables
 * and invokes the callback when any change occurs.
 *
 * @param {string[]} tables - Table names to watch (e.g. ['documents', 'transactions'])
 * @param {Function} callback - Called (with no args) when a change event fires
 * @param {Array} deps - Dependency array; subscription re-creates when these change
 */
export function useSupabaseRealtime(tables, callback, deps = []) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!tables || tables.length === 0) return;

    const channel = supabase.channel(`realtime-${tables.join('-')}-${Date.now()}`);

    tables.forEach(table => {
      channel.on('postgres_changes',
        { event: '*', schema: 'public', table },
        () => callbackRef.current()
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}