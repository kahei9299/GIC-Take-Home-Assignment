import type {
  BackendHealth,
  CafeDetail,
  CafeListItem,
  EmployeeDetail,
  EmployeeListItem,
} from "@/api/contracts";
import { requestJson } from "@/api/http";

export function getHealth() {
  return requestJson<BackendHealth>("/health");
}

export function listCafes(location?: string) {
  const suffix = location ? `?location=${encodeURIComponent(location)}` : "";
  return requestJson<CafeListItem[]>(`/cafes${suffix}`);
}

export function getCafe(id: string) {
  return requestJson<CafeDetail>(`/cafes/${id}`);
}

export function listEmployees(cafeId?: string) {
  const suffix = cafeId ? `?cafe_id=${encodeURIComponent(cafeId)}` : "";
  return requestJson<EmployeeListItem[]>(`/employees${suffix}`);
}

export function getEmployee(id: string) {
  return requestJson<EmployeeDetail>(`/employees/${id}`);
}
