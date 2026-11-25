ALTER TABLE "Appointment" ADD COLUMN "termsAcceptedAt" TIMESTAMPTZ(3);
-- NULL para capturas manuales y datos históricos sin evidencia de aceptación.
