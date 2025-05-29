import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)

  const transactions = useMemo(
    () => {
      if (isLoading) {
        return [] // Return empty array during loading
      }
      // If we have employee-specific transactions, use those
      if (transactionsByEmployee.length > 0) {
        return transactionsByEmployee
      }
      // Otherwise use paginated transactions if available
      return paginatedTransactions?.data || []
    },
    [paginatedTransactions, transactionsByEmployee, isLoading]
  )

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    try {
      await employeeUtils.fetchAll()
      await paginatedTransactionsUtils.fetchAll()
    } finally {
      setIsLoading(false)
    }
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees.length === 0 && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeeUtils.loading}
          defaultValue={EMPTY_EMPLOYEE}
          items={[EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }

            setIsLoading(true)
            try {
              if (newValue.id === EMPTY_EMPLOYEE.id) {
                await loadAllTransactions()
              } else {
                paginatedTransactionsUtils.invalidateData()
                await loadTransactionsByEmployee(newValue.id)
              }
            } finally {
              setIsLoading(false)
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions 
            transactions={transactions}
            onTransactionUpdate={(updatedTransactions) => {
              // Update paginated transactions if we're in that view
              if (paginatedTransactions?.data && transactionsByEmployee.length === 0) {
                paginatedTransactionsUtils.updateData({
                  data: updatedTransactions,
                  nextPage: paginatedTransactions.nextPage
                })
              }
              // Update employee-specific transactions if we're in that view
              if (transactionsByEmployee.length > 0) {
                transactionsByEmployeeUtils.updateData(updatedTransactions)
              }
            }}
          />

          {paginatedTransactions !== null && paginatedTransactions.nextPage !== null && transactionsByEmployee.length === 0 && (
            <button
              className="RampButton"
              disabled={isLoading || paginatedTransactionsUtils.loading}
              onClick={async () => {
                // Don't fetch if already loading
                if (isLoading || paginatedTransactionsUtils.loading) {
                  return
                }
                await paginatedTransactionsUtils.fetchAll()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
