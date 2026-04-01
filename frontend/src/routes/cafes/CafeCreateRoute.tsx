import { useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Form } from "antd";
import type { FormProps } from "antd";
import { unstable_usePrompt, useBeforeUnload, useNavigate } from "react-router-dom";

import { createCafe } from "@/api/client";
import { ApiError } from "@/api/http";
import { PageFrame } from "@/components/layout/PageFrame";
import {
  buildCafeWritePayload,
  CafeFormFields,
  type CafeFormValues,
  EMPTY_CAFE_FORM_VALUES,
  hasDirtyCafeFormValues,
} from "@/routes/cafes/cafeForm";

const INITIAL_VALUES = EMPTY_CAFE_FORM_VALUES;

export function CafeCreateRoute() {
  const [form] = Form.useForm<CafeFormValues>();
  const formValues = Form.useWatch([], form);
  const allowNavigationRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isDirty = hasDirtyCafeFormValues(formValues, INITIAL_VALUES);

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
      // Returning to the list after create relies on a list refetch instead of
      // local optimistic state so the backend stays authoritative.
      await queryClient.invalidateQueries({ queryKey: ["cafes", "list"] });
      navigate("/cafes");
    },
    onError: () => {
      allowNavigationRef.current = false;
    },
  });

  const handleFinish: FormProps<CafeFormValues>["onFinish"] = (values) => {
    createCafeMutation.reset();
    createCafeMutation.mutate(buildCafeWritePayload(values));
  };

  return (
    <PageFrame
      title="Create Cafe"
      description="Capture the basic cafe fields, submit them to the backend, and return to the cafe list after a successful create."
    >
      <CafeFormFields
        form={form}
        initialValues={INITIAL_VALUES}
        onFinish={handleFinish}
        onValuesChange={() => {
          allowNavigationRef.current = false;
        }}
        submitLabel="Create Cafe"
        submitLoading={createCafeMutation.isPending}
        onCancel={() => navigate("/cafes")}
      />
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
          style={{ marginTop: 24 }}
        />
      ) : null}
    </PageFrame>
  );
}
