import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Space } from "antd";
import type { FormProps } from "antd";
import { unstable_usePrompt, useBeforeUnload, useNavigate } from "react-router-dom";

import { createCafe } from "@/api/client";
import type { CafeWriteRequest } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { PageFrame } from "@/components/layout/PageFrame";

type CafeCreateFormValues = {
  name?: string;
  description?: string;
  location?: string;
  logo_url?: string;
};

const INITIAL_VALUES: Required<CafeCreateFormValues> = {
  name: "",
  description: "",
  location: "",
  logo_url: "",
};

function hasDirtyValues(values: CafeCreateFormValues | undefined) {
  if (!values) {
    return false;
  }

  return Object.entries(INITIAL_VALUES).some(([key, initialValue]) => {
    const currentValue = values[key as keyof CafeCreateFormValues] ?? "";
    return currentValue !== initialValue;
  });
}

function buildCreatePayload(values: CafeCreateFormValues): CafeWriteRequest {
  const logoUrl = values.logo_url?.trim();

  return {
    name: values.name?.trim() ?? "",
    description: values.description?.trim() ?? "",
    location: values.location?.trim() ?? "",
    ...(logoUrl ? { logo_url: logoUrl } : {}),
  };
}

export function CafeCreateRoute() {
  const [form] = Form.useForm<CafeCreateFormValues>();
  const formValues = Form.useWatch([], form);
  const allowNavigationRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isDirty = hasDirtyValues(formValues);

  useBeforeUnload((event) => {
    if (!isDirty || allowNavigationRef.current) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  unstable_usePrompt({
    message: "You have unsaved changes. Leave this page?",
    when: ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
  });

  const createCafeMutation = useMutation({
    mutationFn: createCafe,
    onSuccess: async () => {
      allowNavigationRef.current = true;
      await queryClient.invalidateQueries({ queryKey: ["cafes", "list"] });
      navigate("/cafes");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const handleFinish: FormProps<CafeCreateFormValues>["onFinish"] = (values) => {
    createCafeMutation.reset();
    createCafeMutation.mutate(buildCreatePayload(values));
  };

  return (
    <PageFrame
      title="Create Cafe"
      description="Capture the basic cafe fields, submit them to the backend, and return to the cafe list after a successful create."
    >
      <Form<CafeCreateFormValues>
        form={form}
        layout="vertical"
        initialValues={INITIAL_VALUES}
        onFinish={handleFinish}
        onValuesChange={() => {
          allowNavigationRef.current = false;
        }}
        autoComplete="off"
      >
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
        {createCafeMutation.isError ? (
          <Alert
            type="error"
            showIcon
            message="Unable to create cafe"
            description={
              createCafeMutation.error instanceof ApiError
                ? createCafeMutation.error.message
                : "The backend rejected the request."
            }
            style={{ marginBottom: 24 }}
          />
        ) : null}
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createCafeMutation.isPending}
          >
            Create Cafe
          </Button>
          <Button onClick={() => navigate("/cafes")}>Cancel</Button>
        </Space>
      </Form>
    </PageFrame>
  );
}
