import type { ReactNode } from "react";

import { Button, Form, Input, Space, Typography } from "antd";
import type { FormInstance, FormProps } from "antd";

import type { CafeDetail, CafeWriteRequest } from "@/api/contracts";
import { CafeLogo } from "@/routes/cafes/CafeLogo";

export type CafeFormValues = {
  name?: string;
  description?: string;
  location?: string;
  logo_url?: string;
};

export type NormalizedCafeFormValues = Required<CafeFormValues>;

export const EMPTY_CAFE_FORM_VALUES: NormalizedCafeFormValues = {
  name: "",
  description: "",
  location: "",
  logo_url: "",
};

// Create and edit compare against a normalized shape so optional API fields
// and blank form values behave the same way for dirty-form checks.
export function normalizeCafeFormValues(
  values: CafeFormValues | CafeDetail,
): NormalizedCafeFormValues {
  return {
    name: values.name ?? "",
    description: values.description ?? "",
    location: values.location ?? "",
    logo_url: values.logo_url ?? "",
  };
}

export function hasDirtyCafeFormValues(
  values: CafeFormValues | undefined,
  initialValues: NormalizedCafeFormValues | null,
) {
  if (!values || initialValues === null) {
    return false;
  }

  return Object.entries(initialValues).some(([key, initialValue]) => {
    const currentValue = values[key as keyof CafeFormValues] ?? "";
    return currentValue !== initialValue;
  });
}

export function buildCafeWritePayload(values: CafeFormValues): CafeWriteRequest {
  const logoUrl = values.logo_url?.trim();

  return {
    name: values.name?.trim() ?? "",
    description: values.description?.trim() ?? "",
    location: values.location?.trim() ?? "",
    ...(logoUrl ? { logo_url: logoUrl } : {}),
  };
}

type CafeFormFieldsProps = {
  form: FormInstance<CafeFormValues>;
  initialValues?: NormalizedCafeFormValues;
  onFinish: FormProps<CafeFormValues>["onFinish"];
  onValuesChange?: FormProps<CafeFormValues>["onValuesChange"];
  submitLabel: string;
  submitLoading?: boolean;
  onCancel: () => void;
  cancelDisabled?: boolean;
  extraActions?: ReactNode;
};

export function CafeFormFields({
  form,
  initialValues,
  onFinish,
  onValuesChange,
  submitLabel,
  submitLoading,
  onCancel,
  cancelDisabled,
  extraActions,
}: CafeFormFieldsProps) {
  const watchedLogoUrl = Form.useWatch("logo_url", form);

  return (
    <Form<CafeFormValues>
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
      autoComplete="off"
    >
      {/* The cafe field contract stays identical between create and edit so the
          routes can share rendering while keeping their own query/mutation flow. */}
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, whitespace: true, message: "Enter a cafe name." }]}
      >
        <Input placeholder="Central Perk" />
      </Form.Item>
      <Form.Item
        label="Description"
        name="description"
        rules={[{ required: true, whitespace: true, message: "Enter a description." }]}
      >
        <Input.TextArea rows={4} placeholder="Describe the cafe." />
      </Form.Item>
      <Form.Item
        label="Location"
        name="location"
        rules={[{ required: true, whitespace: true, message: "Enter a location." }]}
      >
        <Input placeholder="Central Business District" />
      </Form.Item>
      <Form.Item label="Logo URL" name="logo_url">
        <Input placeholder="https://example.com/logo.png" />
      </Form.Item>
      <div style={{ marginBottom: 24 }}>
        <Typography.Text
          style={{ display: "block", marginBottom: 8 }}
          type="secondary"
        >
          Logo preview
        </Typography.Text>
        <CafeLogo alt="Cafe logo preview" logoUrl={watchedLogoUrl} variant="form" />
      </div>
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
