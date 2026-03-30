/* eslint-disable */
// This file is generated from backend/openapi.json.
// Run `pnpm generate:api` from frontend/ after backend contract changes.

export type CafeDetail = {
  "name": string;
  "description": string;
  "logo_url": string | null;
  "location": string;
};

export type CafeListItem = {
  "id": string;
  "name": string;
  "description": string;
  "logo_url": string | null;
  "location": string;
  "employees": number;
};

export type CafeWriteRequest = {
  "name": string;
  "description": string;
  "logo_url"?: string | null;
  "location": string;
};

export type CafeWriteResponse = {
  "id": string;
  "name": string;
  "description": string;
  "logo_url": string | null;
  "location": string;
};

export type EmployeeCreateRequest = {
  "name": string;
  "email_address": string;
  "phone_number": string;
  "gender": Gender;
  "cafe_id"?: string | null;
};

export type EmployeeDetail = {
  "name": string;
  "email_address": string;
  "phone_number": string;
  "gender": Gender;
  "cafe": string | null;
  "cafe_id": string | null;
};

export type EmployeeListItem = {
  "id": string;
  "name": string;
  "email_address": string;
  "phone_number": string;
  "gender": Gender;
  "days_worked": number;
  "cafe": string | null;
  "cafe_id": string | null;
};

export type EmployeeWriteRequest = {
  "name": string;
  "email_address": string;
  "phone_number": string;
  "gender": Gender;
  "cafe_id"?: string | null;
};

export type EmployeeWriteResponse = {
  "id": string;
  "name": string;
  "email_address": string;
  "phone_number": string;
  "gender": Gender;
  "days_worked": number;
  "cafe": string | null;
  "cafe_id": string | null;
};

export type Gender = "Male" | "Female";

export type HTTPValidationError = {
  "detail"?: ValidationError[];
};

export type ValidationError = {
  "loc": unknown[];
  "msg": string;
  "type": string;
  "input"?: unknown;
  "ctx"?: Record<string, never>;
};
