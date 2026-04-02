import type {
  BackendHealth,
  CafeDetail,
  CafeListItem,
  CafeWriteRequest,
  CafeWriteResponse,
  EmployeeCreateRequest,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeWriteRequest,
  EmployeeWriteResponse,
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

export function createCafe(payload: CafeWriteRequest) {
  return requestJson<CafeWriteResponse>("/cafes", {
    method: "POST",
    body: payload,
  });
}

export function updateCafe(id: string, payload: CafeWriteRequest) {
  return requestJson<CafeWriteResponse>(`/cafes/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteCafe(id: string) {
  return requestJson<void>(`/cafes/${id}`, {
    method: "DELETE",
  });
}

export function listEmployees(cafeId?: string) {
  const suffix = cafeId ? `?cafe=${encodeURIComponent(cafeId)}` : "";
  return requestJson<EmployeeListItem[]>(`/employees${suffix}`);
}

export function getEmployee(id: string) {
  return requestJson<EmployeeDetail>(`/employees/${id}`);
}

export function createEmployee(payload: EmployeeCreateRequest) {
  return requestJson<EmployeeWriteResponse>("/employees", {
    method: "POST",
    body: payload,
  });
}

export function updateEmployee(id: string, payload: EmployeeWriteRequest) {
  return requestJson<EmployeeWriteResponse>(`/employees/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteEmployee(id: string) {
  return requestJson<void>(`/employees/${id}`, {
    method: "DELETE",
  });
}
