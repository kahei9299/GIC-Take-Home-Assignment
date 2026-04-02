import { useEffect, useState, type ReactNode } from "react";

import { Button, Form, Input, Space, Typography, Upload } from "antd";
import type { FormInstance, FormProps } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import type { CafeDetail, CafeWriteRequest } from "@/api/contracts";
import { CafeLogo } from "@/routes/cafes/CafeLogo";

const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;

export type CafeFormValues = {
  name?: string;
  description?: string;
  location?: string;
  logo_url?: string;
  logo_file_list?: UploadFile[];
};

export type NormalizedCafeFormValues = {
  name: string;
  description: string;
  location: string;
  logo_url: string;
};

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

  if ((values.logo_file_list?.length ?? 0) > 0) {
    return true;
  }

  return Object.entries(initialValues).some(([key, initialValue]) => {
    const currentValue = values[key as keyof CafeFormValues] ?? "";
    return currentValue !== initialValue;
  });
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read the selected logo file."));
    reader.readAsDataURL(file);
  });
}

async function validateTrimmedLength(
  value: string | undefined,
  { min, max, label }: { min?: number; max?: number; label: string },
) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return;
  }

  if (typeof min === "number" && trimmed.length < min) {
    throw new Error(`${label} must be at least ${min} characters.`);
  }

  if (typeof max === "number" && trimmed.length > max) {
    throw new Error(`${label} must be at most ${max} characters.`);
  }
}

export async function buildCafeWritePayload(values: CafeFormValues): Promise<CafeWriteRequest> {
  const selectedLogoFile = values.logo_file_list?.[0]?.originFileObj;
  const logoUrl = selectedLogoFile
    ? await readFileAsDataUrl(selectedLogoFile)
    : values.logo_url?.trim();

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
  const watchedLogoFiles = Form.useWatch("logo_file_list", form) ?? [];
  const [previewLogoUrl, setPreviewLogoUrl] = useState(watchedLogoUrl ?? "");

  useEffect(() => {
    const selectedFile = watchedLogoFiles[0]?.originFileObj;
    if (!selectedFile) {
      setPreviewLogoUrl(watchedLogoUrl ?? "");
      return;
    }

    let cancelled = false;
    void readFileAsDataUrl(selectedFile).then((dataUrl) => {
      if (!cancelled) {
        setPreviewLogoUrl(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [watchedLogoFiles, watchedLogoUrl]);

  const uploadProps: UploadProps = {
    accept: "image/*",
    beforeUpload: () => false,
    maxCount: 1,
    onRemove: () => {
      form.setFieldValue("logo_file_list", []);
      return true;
    },
  };

  return (
    <Form<CafeFormValues>
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
      autoComplete="off"
    >
      <Form.Item name="logo_url" hidden>
        <Input type="hidden" />
      </Form.Item>
      {/* The cafe field contract stays identical between create and edit so the
          routes can share rendering while keeping their own query/mutation flow. */}
      <Form.Item
        label="Name"
        name="name"
        rules={[
          { required: true, whitespace: true, message: "Enter a cafe name." },
          {
            validator: async (_, value: string | undefined) => {
              await validateTrimmedLength(value, { min: 6, max: 10, label: "Cafe name" });
            },
          },
        ]}
      >
        <Input placeholder="Central Perk" />
      </Form.Item>
      <Form.Item
        label="Description"
        name="description"
        rules={[
          { required: true, whitespace: true, message: "Enter a description." },
          {
            validator: async (_, value: string | undefined) => {
              await validateTrimmedLength(value, { max: 256, label: "Description" });
            },
          },
        ]}
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
      <Form.Item
        label="Logo"
        name="logo_file_list"
        getValueFromEvent={(event) => event?.fileList}
        valuePropName="fileList"
        rules={[
          {
            validator: async (_, value: UploadFile[] | undefined) => {
              const selectedFile = value?.[0];
              if (!selectedFile) {
                return;
              }

              if ((selectedFile.size ?? 0) > MAX_LOGO_FILE_BYTES) {
                throw new Error("Logo file must be 2 MB or smaller.");
              }
            },
          },
        ]}
      >
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Choose Logo File</Button>
        </Upload>
      </Form.Item>
      <div style={{ marginBottom: 24 }}>
        <Typography.Text
          style={{ display: "block", marginBottom: 8 }}
          type="secondary"
        >
          Logo preview
        </Typography.Text>
        <CafeLogo alt="Cafe logo preview" logoUrl={previewLogoUrl} variant="form" />
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
