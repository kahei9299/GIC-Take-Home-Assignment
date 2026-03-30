export type {
  CafeDetail,
  CafeListItem,
  CafeWriteRequest,
  CafeWriteResponse,
  EmployeeCreateRequest,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeWriteRequest,
  EmployeeWriteResponse,
  Gender,
} from "@/api/generated/openapi";

export type BackendErrorEnvelope = {
  code: string;
  message: string;
  details: unknown;
};

export type BackendHealth = {
  status: string;
};
