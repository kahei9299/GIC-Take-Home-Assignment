import { useEffect, useMemo, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Result } from "antd";
import type { FormProps } from "antd";
import { unstable_usePrompt, useBeforeUnload, useNavigate, useParams } from "react-router-dom";

import { deleteCafe, getCafe, updateCafe } from "@/api/client";
import type { CafeWriteRequest } from "@/api/contracts";
import { ApiError } from "@/api/http";
import { QueryState } from "@/components/feedback/QueryState";
import { PageFrame } from "@/components/layout/PageFrame";
import {
  buildCafeWritePayload,
  CafeFormFields,
  type CafeFormValues,
  hasDirtyCafeFormValues,
  normalizeCafeFormValues,
} from "@/routes/cafes/cafeForm";

export function CafeEditRoute() {
  const { modal } = App.useApp();
  const [form] = Form.useForm<CafeFormValues>();
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

    // Edit starts from the backend detail payload, then the shared helper
    // normalizes optional fields into the same shape used by the form.
    return normalizeCafeFormValues(cafeQuery.data);
  }, [cafeQuery.data]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    form.setFieldsValue(initialValues);
    allowNavigationRef.current = false;
  }, [form, initialValues]);

  const isDirty = hasDirtyCafeFormValues(formValues, initialValues);

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
      // Update returns to the list, so both list and detail caches are
      // invalidated before navigation to avoid stale hosted-latency reads.
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

  const handleFinish: FormProps<CafeFormValues>["onFinish"] = (values) => {
    updateCafeMutation.reset();
    deleteCafeMutation.reset();
    updateCafeMutation.mutate(buildCafeWritePayload(values));
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
      description="View and update cafe details, including name and location. Changes are not saved until the form is submitted."
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
          <CafeFormFields
            form={form}
            initialValues={initialValues ?? undefined}
            onFinish={handleFinish}
            onValuesChange={() => {
              allowNavigationRef.current = false;
            }}
            submitLabel="Save Changes"
            submitLoading={updateCafeMutation.isPending}
            onCancel={() => navigate("/cafes")}
            cancelDisabled={deleteCafeMutation.isPending}
            extraActions={
              <Button
                danger
                onClick={handleDelete}
                loading={deleteCafeMutation.isPending}
                disabled={updateCafeMutation.isPending}
              >
                Delete Cafe
              </Button>
            }
          />
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
              style={{ marginTop: 24 }}
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
              style={{ marginTop: 24 }}
            />
          ) : null}
        </QueryState>
      )}
    </PageFrame>
  );
}
