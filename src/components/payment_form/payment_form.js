import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { PaymentFormActionsContext } from "containers/data_context";

import buildBooking from "./utils/builld_booking";
import BillingAddress from "./billing_address";
import CardCaptureForm from "./card_capture_form";
import CustomerInfo from "./customer_info";
import ErrorModal from "./error_modal";
import GuestInfo from "./guest_info";
import SubmitSection from "./submit_section";

const getSchema = () =>
  yup.object({
    customer: CustomerInfo.getSchema(),
    guest: GuestInfo.getSchema(),
    billingAddress: BillingAddress.getSchema(),
  });

const EMPTY_FORM = {};

export default function PaymentForm({ channelId, property, rooms, params, onSuccess }) {
  const { setSubmitHandler, createBooking } = useContext(PaymentFormActionsContext);
  const [isErrorModalVisible, setErrorModalVisibility] = useState(false);
  const [isCaptureFormValid, setIsCaptureFormValid] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const paymentFormMethods = useForm({
    mode: "onChange",
    resolver: yupResolver(getSchema()),
  });
  const captureFormRef = useRef();
  const paymentFormRef = useRef();
  const maxGuests = params.adults + params.children;
  const { requestCreditCard = true } = property;
  const { handleSubmit } = paymentFormMethods;

  const toggleErrorModal = useCallback(() => {
    setErrorModalVisibility(!isErrorModalVisible);
  }, [isErrorModalVisible]);

  const handleCreateBooking = useCallback(
    async (formParams, cardParams) => {
      if ((requestCreditCard && !cardParams) || !formParams) {
        toggleErrorModal();
        return;
      }

      const booking = buildBooking(property, rooms, params, cardParams, formParams);

      try {
        const bookingParams = await createBooking(channelId, booking);

        onSuccess(bookingParams);
      } catch (error) {
        toggleErrorModal();
        captureFormRef.current.resetSession();
      }

      setFormData(EMPTY_FORM);
    },
    [
      channelId,
      createBooking,
      requestCreditCard,
      captureFormRef,
      property,
      rooms,
      params,
      toggleErrorModal,
      onSuccess,
    ],
  );

  const handlePaymentFormSubmitted = useCallback(
    (newFormData) => {
      if (!isCaptureFormValid) {
        return;
      }

      const submitHandler = requestCreditCard ? captureFormRef.current.submit : handleCreateBooking;
      setFormData(newFormData);
      submitHandler(newFormData, null);
    },
    [isCaptureFormValid, captureFormRef, requestCreditCard, handleCreateBooking],
  );

  const handleCaptureFormValidated = useCallback(
    async ({ valid }) => {
      setIsCaptureFormValid(valid);
      handleSubmit(handlePaymentFormSubmitted)();
    },
    [handleSubmit, handlePaymentFormSubmitted],
  );

  const handleCaptureFormSubmitted = useCallback(
    (submitEvent) => {
      const { card } = submitEvent;

      handleCreateBooking(formData, card);
    },
    [handleCreateBooking, formData],
  );

  useEffect(
    function initSubmitHandler() {
      const paymentFormSubmit = handleSubmit(handlePaymentFormSubmitted);
      const captureFormSubmit = captureFormRef.current.validate;
      const submitHandler = requestCreditCard ? captureFormSubmit : paymentFormSubmit;

      setSubmitHandler(submitHandler);
    },
    [requestCreditCard, setSubmitHandler, captureFormRef, handlePaymentFormSubmitted, handleSubmit],
  );

  return (
    <>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <FormProvider {...paymentFormMethods}>
        <form ref={paymentFormRef} onSubmit={handleSubmit(handlePaymentFormSubmitted)}>
          <CustomerInfo.Form />
          <GuestInfo.Form maxGuests={maxGuests} />
          <BillingAddress.Form />
        </form>
        <CardCaptureForm
          visible={requestCreditCard}
          ref={captureFormRef}
          onSubmit={handleCaptureFormSubmitted}
          onValidate={handleCaptureFormValidated}
        />
        <SubmitSection />
      </FormProvider>
      <ErrorModal visible={isErrorModalVisible} onClose={toggleErrorModal} />
    </>
  );
}
