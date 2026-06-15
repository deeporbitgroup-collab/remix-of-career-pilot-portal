-- Create trigger function to update student status to payment_uploaded when receipt is uploaded
CREATE OR REPLACE FUNCTION public.handle_payment_receipt_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a student uploads a payment receipt, update their status to payment_uploaded
  UPDATE public.talent_pool_users
  SET status = 'payment_uploaded'::talent_pool_user_status
  WHERE id = NEW.user_id
    AND role = 'STUDENT'::talent_pool_role
    AND status = 'accepted_pending_payment'::talent_pool_user_status;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires when a new payment receipt is inserted
DROP TRIGGER IF EXISTS on_payment_receipt_uploaded ON public.talent_pool_payment_receipts;

CREATE TRIGGER on_payment_receipt_uploaded
  AFTER INSERT ON public.talent_pool_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_receipt_upload();