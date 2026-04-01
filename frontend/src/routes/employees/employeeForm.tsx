import type { ReactNode } from "react";

import { Button, Form, Input, Select, Space } from "antd";
import type { FormInstance, FormProps } from "antd";

import type { CafeListItem, EmployeeCreateRequest, EmployeeDetail, Gender } from "@/api/contracts";

export type EmployeeFormValues = {
  name?: string;
  email_address?: string;
  phone_number?: string;
  gender?: Gender;
  cafe_id?: string;
};

export type NormalizedEmployeeFormValues = {
  name: string;
  email_address: string;
  phone_number: string;
  gender: Gender | "";
  cafe_id: string;
};

export const EMPTY_EMPLOYEE_FORM_VALUES: NormalizedEmployeeFormValues = {
  name: "",
  email_address: "",
  phone_number: "",
  gender: "",
  cafe_id: "",
};

const GENDER_OPTIONS: Array<{ label: Gender; value: Gender }> = [
  { label: "Female", value: "Female" },
  { label: "Male", value: "Male" },
];

export function normalizeEmployeeFormValues(
  values: EmployeeFormValues | EmployeeDetail,
): NormalizedEmployeeFormValues {
  return {
    name: values.name ?? "",
    email_address: values.email_address ?? "",
    phone_number: values.phone_number ?? "",
    gender: values.gender ?? "",
    cafe_id: values.cafe_id ?? "",
  };
}

export function hasDirtyEmployeeFormValues(
  values: EmployeeFormValues | undefined,
  initialValues: NormalizedEmployeeFormValues | null,
) {
  if (!values || initialValues === null) {
    return false;
  }

  return Object.entries(initialValues).some(([key, initialValue]) => {
    const currentValue = values[key as keyof EmployeeFormValues] ?? "";
    return currentValue !== initialValue;
  });
}

export function buildEmployeeCreatePayload(values: EmployeeFormValues): EmployeeCreateRequest {
  return {
    name: values.name?.trim() ?? "",
    email_address: values.email_address?.trim() ?? "",
    phone_number: values.phone_number?.trim() ?? "",
    gender: values.gender as Gender,
    cafe_id: values.cafe_id ?? "",
  };
}

type EmployeeFormFieldsProps = {
  form: FormInstance<EmployeeFormValues>;
  cafes: CafeListItem[];
  initialValues?: NormalizedEmployeeFormValues;
  onFinish: FormProps<EmployeeFormValues>["onFinish"];
  onValuesChange?: FormProps<EmployeeFormValues>["onValuesChange"];
  submitLabel: string;
  submitLoading?: boolean;
  onCancel: () => void;
  cancelDisabled?: boolean;
  extraActions?: ReactNode;
};

export function EmployeeFormFields({
  form,
  cafes,
  initialValues,
  onFinish,
  onValuesChange,
  submitLabel,
  submitLoading,
  onCancel,
  cancelDisabled,
  extraActions,
}: EmployeeFormFieldsProps) {
  return (
    <Form<EmployeeFormValues>
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
      autoComplete="off"
    >
      {/* Create and edit share one field contract so assignment and identity
          inputs stay consistent across future employee write routes. */}
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, whitespace: true, message: "Enter an employee name." }]}
      >
        <Input placeholder="Alicia Tan" />
      </Form.Item>
      <Form.Item
        label="Email"
        name="email_address"
        rules={[
          { required: true, whitespace: true, message: "Enter an email address." },
          {
            validator: async (_, value: string | undefined) => {
              if (!value || value.trim().length === 0) {
                return;
              }

              const normalized = value.trim();
              const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
              if (!isValidEmail) {
                throw new Error("Enter a valid email address.");
              }
            },
          },
        ]}
      >
        <Input placeholder="alicia.tan@example.com" />
      </Form.Item>
      <Form.Item
        label="Phone Number"
        name="phone_number"
        rules={[
          { required: true, whitespace: true, message: "Enter a phone number." },
          {
            validator: async (_, value: string | undefined) => {
              if (!value || value.trim().length === 0) {
                return;
              }

              if (!/^[89]\d{7}$/.test(value.trim())) {
                throw new Error("Enter a valid Singapore phone number.");
              }
            },
          },
        ]}
      >
        <Input placeholder="91234567" />
      </Form.Item>
      <Form.Item label="Gender" name="gender" rules={[{ required: true, message: "Select a gender." }]}>
        <Select placeholder="Select a gender" options={GENDER_OPTIONS} virtual={false} />
      </Form.Item>
      <Form.Item
        label="Assigned Cafe"
        name="cafe_id"
        rules={[{ required: true, message: "Select a cafe assignment." }]}
      >
        <Select
          placeholder="Select a cafe"
          options={cafes.map((cafe) => ({ label: cafe.name, value: cafe.id }))}
          virtual={false}
        />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit" loading={submitLoading}>
          {submitLabel}
        </Button>
        <Button onClick={onCancel} disabled={cancelDisabled}>
          Cancel
        </Button>
        {extraActions}
      </Space>
    </Form>
  );
}
