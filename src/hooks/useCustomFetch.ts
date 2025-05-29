import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        // For transactions, merge with approval cache
        if (endpoint === 'paginatedTransactions' || endpoint === 'transactionsByEmployee') {
          const result = await fakeFetch<TData>(endpoint, params)
          if (result) {
            const transactions = result as any
            const data = Array.isArray(transactions) ? transactions : transactions.data
            
            // Get all approval states
            const approvalCache = new Map()
            cache?.current.forEach((value, key) => {
              if (key.startsWith('transactionApproval@')) {
                const [, transactionId] = key.split('@')
                approvalCache.set(transactionId, JSON.parse(value))
              }
            })

            // Apply cached approval states
            const updatedData = data.map((transaction: any) => {
              const cachedApproval = approvalCache.get(transaction.id)
              return cachedApproval !== undefined
                ? { ...transaction, approved: cachedApproval }
                : transaction
            })

            if (Array.isArray(transactions)) {
              cache?.current.set(cacheKey, JSON.stringify(updatedData))
              return updatedData as unknown as TData
            } else {
              const updatedResult = { ...transactions, data: updatedData }
              cache?.current.set(cacheKey, JSON.stringify(updatedResult))
              return updatedResult as unknown as TData
            }
          }
        }

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        
        // Store approval state in cache
        if (endpoint === 'setTransactionApproval' && params) {
          const { transactionId, value } = params as { transactionId: string; value: boolean }
          cache?.current.set(`transactionApproval@${transactionId}`, JSON.stringify(value))
        }
        
        return result
      }),
    [cache, wrappedRequest]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return { fetchWithCache, fetchWithoutCache, clearCache, clearCacheByEndpoint, loading }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
