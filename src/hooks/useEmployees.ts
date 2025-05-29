import { useCallback, useState } from "react"
import { Employee } from "../utils/types"
import { useCustomFetch } from "./useCustomFetch"
import { EmployeeResult } from "./types"

export function useEmployees(): EmployeeResult {
  const { fetchWithCache, loading } = useCustomFetch()
  const [employees, setEmployees] = useState<Employee[]>([])

  const fetchAll = useCallback(async () => {
    const employeesData = await fetchWithCache<Employee[]>("employees")
    setEmployees(employeesData || [])
  }, [fetchWithCache])

  const invalidateData = useCallback(() => {
    setEmployees([])
  }, [])

  return { data: employees, loading, fetchAll, invalidateData }
}
