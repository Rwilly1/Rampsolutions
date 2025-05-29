import { useCallback, useState } from "react"
import { PaginatedRequestParams, PaginatedResponse, Transaction } from "../utils/types"
import { PaginatedTransactionsResult } from "./types"
import { useCustomFetch } from "./useCustomFetch"

export function usePaginatedTransactions(): PaginatedTransactionsResult {
  const { fetchWithCache, loading } = useCustomFetch()
  const [paginatedTransactions, setPaginatedTransactions] = useState<PaginatedResponse<Transaction[]>>({ data: [], nextPage: 0 })

  const fetchAll = useCallback(async () => {
    // Don't fetch if there are no more pages
    if (paginatedTransactions.nextPage === null) {
      return
    }

    const response = await fetchWithCache<PaginatedResponse<Transaction[]>, PaginatedRequestParams>(
      "paginatedTransactions",
      {
        page: paginatedTransactions.nextPage,
      }
    )

    setPaginatedTransactions((previousResponse) => {
      if (response === null) {
        return previousResponse
      }

      // Create a map of existing transactions by ID to preserve approval states
      const existingTransactionsMap = new Map(
        previousResponse.data.map(t => [t.id, t])
      )

      // Add new transactions to the map, preserving approval states
      response.data.forEach(newTransaction => {
        const existing = existingTransactionsMap.get(newTransaction.id)
        existingTransactionsMap.set(
          newTransaction.id,
          existing ? { ...newTransaction, approved: existing.approved } : newTransaction
        )
      })

      return {
        data: Array.from(existingTransactionsMap.values()),
        nextPage: response.nextPage
      }
    })
  }, [fetchWithCache, paginatedTransactions])

  const invalidateData = useCallback(() => {
    setPaginatedTransactions({ data: [], nextPage: 0 })
  }, [])

  const updateData = useCallback((data: PaginatedResponse<Transaction[]>) => {
    setPaginatedTransactions(data)
  }, [])

  return { data: paginatedTransactions, loading, fetchAll, invalidateData, updateData }
}
