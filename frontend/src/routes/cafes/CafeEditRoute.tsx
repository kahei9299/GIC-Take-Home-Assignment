import { useEffect, useMemo, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Input, Result, Space } from "antd";
import type { FormProps } from "antd";
import { unstable_usePrompt, useBeforeUnload, useNavigate, useParams } from "react-router-dom";

import { deleteCafe, getCafe, updateCafe } from "@/api/client";
import type { CafeDetail, CafeWriteRequest } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";

type CafeEditFormValues = {
  name?: string;
  description?: string;
  location?: string;
  logo_url?: string;
};

type NormalizedCafeFormValues = Required<CafeEditFormValues>;

function normalizeFormValues(values: CafeEditFormValues | CafeDetail): NormalizedCafeFormValues {
  return {
    name: values.name ?? "",
    description: values.description ?? "",
    location: values.location ?? "",
    logo_url: values.logo_url ?? "",
  };
}

function hasDirtyValues(
  values: CafeEditFormValues | undefined,
  initialValues: NormalizedCafeFormValues | null,
) {
  if (!values || initialValues === null) {
    return false;
  }

  return Object.entries(initialValues).some(([key, initialValue]) => {
    const currentValue = values[key as keyof CafeEditFormValues] ?? "";
    return currentValue !== initialValue;
  });
}

function buildCafePayload(values: CafeEditFormValues): CafeWriteRequest {
  const logoUrl = values.logo_url?.trim();

  return {
    name: values.name?.trim() ?? "",
    description: values.description?.trim() ?? "",
    location: values.location?.trim() ?? "",
    ...(logoUrl ? { logo_url: logoUrl } : {}),
  };
}

export function CafeEditRoute() {
  const { modal } = App.useApp();
  const [form] = Form.useForm<CafeEditFormValues>();
  const formValues = Form.useWatch([], form);
  const allowNavigationRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const cafeQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ["cafes", "detail", id],
    queryFn: () => getCafe(id ?? ""),
  });

  const initialValues = useMemo(() => {
    if (!cafeQuery.data) {
      return null;
    }

    return normalizeFormValues(cafeQuery.data);
  }, [cafeQuery.data]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    form.setFieldsValue(initialValues);
    allowNavigationRef.current = false;
  }, [form, initialValues]);

  const isDirty = hasDirtyValues(formValues, initialValues);

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

  const updateCafeMutation = useMutation({
    mutationFn: (values: CafeWriteRequest) => updateCafe(id ?? "", values),
    onSuccess: async () => {
      allowNavigationRef.current = true;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cafes", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["cafes", "detail", id] }),
      ]);
      navigate("/cafes");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const deleteCafeMutation = useMutation({
    mutationFn: () => deleteCafe(id ?? ""),
    onSuccess: async () => {
      allowNavigationRef.current = true;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cafes", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["cafes", "detail", id] }),
      ]);
      navigate("/cafes");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const handleFinish: FormProps<CafeEditFormValues>["onFinish"] = (values) => {
    updateCafeMutation.reset();
    deleteCafeMutation.reset();
    updateCafeMutation.mutate(buildCafePayload(values));
  };

  const handleDelete = () => {
    updateCafeMutation.reset();
    deleteCafeMutation.reset();

    modal.confirm({
      title: "Delete this cafe?",
      content:
        "Deleting a cafe also removes employees who are currently assigned to it. This action cannot be undone.",
      okText: "Delete Cafe",
      cancelText: "Cancel",
      okButtonProps: { danger: true, loading: deleteCafeMutation.isPending },
      onOk: async () => {
        await deleteCafeMutation.mutateAsync().catch(() => undefined);
      },
    });
  };

  const readError = cafeQuery.error instanceof ApiError ? cafeQuery.error : null;
  const isNotFound = readError?.status === 404;

  return (
    <PageFrame
      title="Edit Cafe"
      description="Load one cafe by ID, edit the stored fields, and use the destructive delete flow when the backend contract allows it."
    >
      {isNotFound || (!cafeQuery.isPending && !cafeQuery.isError && !cafeQuery.data) ? (
        <Result
          status="warning"
          title="Cafe not found"
          subTitle="This cafe no longer exists or the URL is invalid."
          extra={
            <Button type="primary" onClick={() => navigate("/cafes")}>
              Return to cafes
            </Button>
          }
        />
      ) : (
        <QueryState
          isPending={cafeQuery.isPending}
          isError={cafeQuery.isError && !isNotFound}
          onRetry={() => void cafeQuery.refetch()}
          pendingTitle="Loading cafe details"
          pendingDescription="Fetching the latest editable cafe fields from the backend."
          errorTitle="Unable to load cafe details"
          errorDescription="The backend did not complete this cafe detail read. Retry when the service is reachable again."
        >
          <Form<CafeEditFormValues>
            form={form}
            layout="vertical"
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
            {updateCafeMutation.isError ? (
              <Alert
                type="error"
                showIcon
                message="Unable to update cafe"
                description={
                  updateCafeMutation.error instanceof ApiError
                    ? updateCafeMutation.error.message
                    : "The backend rejected the update."
                }
                style={{ marginBottom: 24 }}
              />
            ) : null}
            {deleteCafeMutation.isError ? (
              <Alert
                type="error"
                showIcon
                message="Unable to delete cafe"
                description={
                  deleteCafeMutation.error instanceof ApiError
                    ? deleteCafeMutation.error.message
                    : "The backend rejected the delete request."
                }
                style={{ marginBottom: 24 }}
              />
            ) : null}
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateCafeMutation.isPending}
                disabled={deleteCafeMutation.isPending}
              >
                Save Changes
              </Button>
              <Button onClick={() => navigate("/cafes")}>Cancel</Button>
              <Button
                danger
                onClick={handleDelete}
                loading={deleteCafeMutation.isPending}
                disabled={updateCafeMutation.isPending}
              >
                Delete Cafe
              </Button>
            </Space>
          </Form>
        </QueryState>
      )}
    </PageFrame>
  );
}
