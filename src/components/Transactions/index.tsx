import { useCallback } from "react"
import { useCustomFetch } from "src/hooks/useCustomFetch"
import { SetTransactionApprovalParams } from "src/utils/types"
import { TransactionPane } from "./TransactionPane"
import { SetTransactionApprovalFunction, TransactionsComponent } from "./types"

export const Transactions: TransactionsComponent = ({ transactions, onTransactionUpdate }) => {
  const { fetchWithoutCache, loading } = useCustomFetch()

  const setTransactionApproval = useCallback<SetTransactionApprovalFunction>(
    async ({ transactionId, newValue }) => {
      // First update the UI optimistically
      if (transactions) {
        const updatedTransactions = transactions.map((transaction) =>
          transaction.id === transactionId
            ? { ...transaction, approved: newValue }
            : transaction
        )
        if (onTransactionUpdate) {
          onTransactionUpdate(updatedTransactions)
        }
      }

      // Then make the API call
      try {
        await fetchWithoutCache<void, SetTransactionApprovalParams>("setTransactionApproval", {
          transactionId,
          value: newValue,
        })
      } catch (error) {
        // If the API call fails, revert the optimistic update
        if (transactions) {
          const revertedTransactions = transactions.map((transaction) =>
            transaction.id === transactionId
              ? { ...transaction, approved: !newValue }
              : transaction
          )
          if (onTransactionUpdate) {
            onTransactionUpdate(revertedTransactions)
          }
        }
        throw error
      }
    },
    [fetchWithoutCache, transactions, onTransactionUpdate]
  )

  if (transactions === null) {
    return <div className="RampLoading--container">Loading...</div>
  }

  return (
    <div data-testid="transaction-container">
      {transactions.map((transaction) => (
        <TransactionPane
          key={transaction.id}
          transaction={transaction}
          loading={loading}
          setTransactionApproval={setTransactionApproval}
        />
      ))}
    </div>
  )
}
