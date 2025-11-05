// Custom hook for optimized data fetching with caching and parallel requests
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (url, params = {}) => {
  const paramString = Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : '';
  return `${url}${paramString}`;
};

const setCacheData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const getCacheData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const useOptimizedFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  
  const {
    cache: enableCache = true,
    params = {},
    skip = false,
    fetchOptions = {}
  } = options;

  // Memoize the cache key to prevent unnecessary re-renders
  const cacheKey = useMemo(() => getCacheKey(url, params), [url, params]);

  const fetchData = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }
    
    // Check cache first
    if (enableCache) {
      const cachedData = getCacheData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        ...fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache the result
      if (enableCache) {
        setCacheData(cacheKey, result);
      }
      
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error(`Error fetching ${url}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, skip, enableCache, cacheKey, fetchOptions]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(cacheKey); // Clear cache for this request
    fetchData();
  }, [fetchData, cacheKey]);

  return { data, loading, error, refetch };
};

// Hook for parallel data fetching
export const useParallelFetch = (requests) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      const promises = requests.map(async (request) => {
        const { key, url, options = {} } = request;
        
        try {
          // Check cache first
          if (options.cache !== false) {
            const cachedData = getCacheData(url);
            if (cachedData) {
              return { key, data: cachedData, error: null };
            }
          }

          const response = await fetch(url, options.fetchOptions);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          
          // Cache the result
          if (options.cache !== false) {
            setCacheData(url, result);
          }
          
          return { key, data: result, error: null };
        } catch (error) {
          return { key, data: null, error };
        }
      });

      try {
        const results = await Promise.allSettled(promises);
        
        const newData = {};
        const newErrors = {};
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { key, data: resultData, error } = result.value;
            newData[key] = resultData;
            if (error) {
              newErrors[key] = error;
            }
          } else {
            const { key } = requests[index];
            newErrors[key] = result.reason;
          }
        });
        
        setData(newData);
        setErrors(newErrors);
      } catch (error) {
        console.error('Error in parallel fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    if (requests.length > 0) {
      fetchAllData();
    }
  }, [requests]);

  return { data, loading, errors };
};

// Cache management utilities
export const clearCache = () => {
  cache.clear();
};

export const clearCacheByPattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Preload data for faster navigation
export const preloadData = (url, options = {}) => {
  const cacheKey = getCacheKey(url, options.params || {});
  
  if (!getCacheData(cacheKey)) {
    fetch(url, options.fetchOptions)
      .then(response => response.json())
      .then(data => setCacheData(cacheKey, data))
      .catch(error => console.warn('Preload failed:', error));
  }
};

// Default export for convenience
export default useOptimizedFetch;
